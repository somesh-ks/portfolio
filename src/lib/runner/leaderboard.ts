/**
 * Shared leaderboard for the runner, server only.
 *
 * Kept simple on purpose. A run starts with a stateless HMAC token (the
 * issue time and a nonce), and a score is accepted only if it is reachable in
 * the time since then. The board is keyed by the token nonce, so replaying a
 * token (even with another name) can only raise that one entry. Submissions are rate limited per salted
 * IP hash. This stops casual tampering, not a determined bot, which is the
 * right trade for a portfolio toy.
 *
 * Storage is Upstash Redis over its REST API (no SDK). Without its env vars
 * the leaderboard reports itself disabled and the game keeps a local best.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { maxScoreFor } from "./sim";

type Env = Record<string, string | undefined>;

const BOARD_KEY = "runner:board";
/** nonce -> name. The board's members are nonces, so one token is one entry. */
const NAMES_KEY = "runner:names";
const KEEP = 100;
const TOP = 10;
const TOKEN_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const SUBMISSIONS_PER_HOUR = 20;

/** Words a first name may not contain. Names are short and letter-only, so a
 * substring check on the letters is the whole moderation surface. */
const BLOCKED = [
  "fuck",
  "fuk",
  "shit",
  "cunt",
  "cock",
  "pussy",
  "nigg",
  "nigga",
  "kkk",
  "rape",
  "hitler",
  "whore",
  "slut",
  "bitch",
  "penis",
  "porn",
];

export interface Entry {
  name: string;
  score: number;
}

/** A first name: 1 to 12 letters, single spaces, hyphens or apostrophes. */
export function normalizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.normalize("NFC").trim().replace(/\s+/g, " ");
  if (!/^\p{L}[\p{L}\p{M}' -]{0,11}$/u.test(name)) return null;
  const letters = name.toLowerCase().replace(/[^\p{L}]/gu, "");
  if (BLOCKED.some((word) => letters.includes(word))) return null;
  return name;
}

function redisConfig(env: Env) {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

function secretKey(env: Env): Buffer | null {
  const raw = env.PORTFOLIO_COOKIE_SECRET;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  return key.length >= 32 ? key : null;
}

export function isLeaderboardEnabled(env: Env = process.env): boolean {
  return Boolean(redisConfig(env) && secretKey(env));
}

function mac(key: Buffer, payload: string): string {
  return createHmac("sha256", key).update(`runner|${payload}`).digest("base64url");
}

export function createRunToken(env: Env = process.env, now = Date.now()): string | null {
  const key = secretKey(env);
  if (!key) return null;
  const payload = `r1.${now}.${randomBytes(9).toString("base64url")}`;
  return `${payload}.${mac(key, payload)}`;
}

export function readRunToken(token: unknown, env: Env = process.env, now = Date.now()) {
  const key = secretKey(env);
  if (!key || typeof token !== "string" || token.length > 200) return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "r1") return null;
  const [, issuedRaw = "", nonce = "", sig = ""] = parts;
  const expected = Buffer.from(mac(key, `r1.${issuedRaw}.${nonce}`));
  const actual = Buffer.from(sig);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  const issued = Number(issuedRaw);
  if (!Number.isInteger(issued) || issued > now || now - issued > TOKEN_MAX_AGE_MS) return null;
  return { issued, nonce };
}

/** Allow a little slack for latency between the token and the first frame. */
export function isPlausible(points: number, elapsedMs: number): boolean {
  if (!Number.isInteger(points) || points < 1) return false;
  return points <= maxScoreFor(elapsedMs / 1000 + 1) + 5;
}

async function redis(env: Env, commands: (string | number)[][]): Promise<unknown[]> {
  const config = redisConfig(env);
  if (!config) throw new Error("leaderboard disabled");
  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`redis ${response.status}`);
  const results = (await response.json()) as { result?: unknown; error?: string }[];
  return results.map((item) => {
    if (item.error) throw new Error(item.error);
    return item.result;
  });
}

/** ZREVRANGE WITHSCORES gives [nonce, score, ...]; look the names up. */
async function withNames(env: Env, flat: unknown): Promise<Entry[]> {
  if (!Array.isArray(flat) || flat.length === 0) return [];
  const nonces = flat.filter((_, i) => i % 2 === 0).map(String);
  const [names] = await redis(env, [["HMGET", NAMES_KEY, ...nonces]]);
  return nonces.map((_, i) => ({
    name: String((names as unknown[] | undefined)?.[i] ?? "?"),
    score: Number(flat[i * 2 + 1]),
  }));
}

export async function topScores(env: Env = process.env): Promise<Entry[]> {
  const [flat] = await redis(env, [["ZREVRANGE", BOARD_KEY, 0, TOP - 1, "WITHSCORES"]]);
  return withNames(env, flat);
}

function ipKey(ip: string, env: Env): string {
  const key = secretKey(env) ?? Buffer.alloc(32);
  const hour = Math.floor(Date.now() / 3_600_000);
  return `runner:rl:${createHmac("sha256", key).update(`ip|${hour}|${ip}`).digest("base64url").slice(0, 16)}`;
}

export type SubmitResult =
  | { ok: true; top: Entry[] }
  | { ok: false; reason: "invalid" | "limited" };

export async function submitScore(
  input: { token: unknown; name: unknown; score: unknown },
  ip: string,
  env: Env = process.env,
  now = Date.now(),
): Promise<SubmitResult> {
  const run = readRunToken(input.token, env, now);
  const name = normalizeName(input.name);
  const points = Number(input.score);
  if (!run || !name || !isPlausible(points, now - run.issued))
    return { ok: false, reason: "invalid" };

  const limiter = ipKey(ip, env);
  const [count] = await redis(env, [
    ["INCR", limiter],
    ["EXPIRE", limiter, 3600],
  ]);
  if (Number(count) > SUBMISSIONS_PER_HOUR) return { ok: false, reason: "limited" };

  const results = await redis(env, [
    // The first name sent with a token sticks; later sends can only raise its score.
    ["HSETNX", NAMES_KEY, run.nonce, name],
    ["ZADD", BOARD_KEY, "GT", points, run.nonce],
    ["ZREMRANGEBYRANK", BOARD_KEY, 0, -(KEEP + 1)],
    ["ZREVRANGE", BOARD_KEY, 0, TOP - 1, "WITHSCORES"],
  ]);
  return { ok: true, top: await withNames(env, results[3]) };
}

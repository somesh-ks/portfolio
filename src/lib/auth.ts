/**
 * Server-side gate for locked case studies.
 *
 * Passwords: scrypt (memory-hard), stored as
 *   scrypt:<log2N>:<r>:<p>:<salt b64url>:<key b64url>
 * (colons, not $, so dotenv files never try to expand it)
 * Sessions and magic links: HMAC-SHA256 over a purpose-tagged payload that
 * includes the expiry, so neither can be extended or reused across purposes.
 */
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { isLockedSlug, LOCKED_SLUGS, type LockedSlug } from "./site";

export const SESSION_COOKIE = "portfolio_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAGIC_LINK_TTL_SECONDS = 60 * 60 * 24 * 14;
/** Fixed delay on a wrong password. Serverless instances share no memory, so
 * an in-process counter would reset per instance; real rate limiting belongs
 * to a Vercel Firewall rule on POST /api/unlock (see docs/protected-content.md). */
export const FAILED_ATTEMPT_DELAY_MS = 750;

const SCRYPT_LOG2_N = 17; // OWASP 2025 baseline: N=2^17, r=8, p=1
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;

function scrypt(password: string, salt: Buffer, log2n: number, r: number, p: number) {
  return new Promise<Buffer>((resolve, reject) => {
    const N = 2 ** log2n;
    scryptCb(password, salt, KEY_LENGTH, { N, r, p, maxmem: 256 * N * r }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string, log2n = SCRYPT_LOG2_N): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, log2n, SCRYPT_R, SCRYPT_P);
  return [
    "scrypt",
    log2n,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join(":");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.trim().split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [log2n, r, p] = parts.slice(1, 4).map(Number) as [number, number, number];
  if (![log2n, r, p].every(Number.isInteger) || log2n < 14 || log2n > 20) return false;
  const salt = Buffer.from(parts[4] ?? "", "base64url");
  const expected = Buffer.from(parts[5] ?? "", "base64url");
  if (salt.length < 16 || expected.length !== KEY_LENGTH) return false;
  const actual = await scrypt(password, salt, log2n, r, p);
  return timingSafeEqual(actual, expected);
}

/** Which locked slugs does this password open? A per-slug hash opens only
 * that slug; the shared hash opens every locked slug. */
export async function scopeForPassword(
  password: string,
  slug: LockedSlug,
  env: Record<string, string | undefined> = process.env,
): Promise<LockedSlug[]> {
  if (!password || password.length > 512) return [];
  const own = env[`PORTFOLIO_PASSWORD_${slug.toUpperCase()}_HASH`];
  if (own && (await verifyPassword(password, own))) return [slug];
  const shared = env.PORTFOLIO_PASSWORD_HASH;
  if (shared && (await verifyPassword(password, shared))) return [...LOCKED_SLUGS];
  return [];
}

function secretKey(env: Record<string, string | undefined> = process.env): Buffer | null {
  const raw = env.PORTFOLIO_COOKIE_SECRET;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  return key.length >= 32 ? key : null;
}

function mac(key: Buffer, message: string): Buffer {
  return createHmac("sha256", key).update(message).digest();
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

type Purpose = "session" | "link";

function sign(purpose: Purpose, scope: readonly string[], exp: number, key: Buffer): string {
  const payload = `v1.${exp}.${scope.join("+")}`;
  return `${payload}.${mac(key, `${purpose}|${payload}`).toString("base64url")}`;
}

function verify(purpose: Purpose, token: string, key: Buffer, now: number) {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const [, expRaw = "", scopeRaw = "", sig = ""] = parts;
  const payload = `v1.${expRaw}.${scopeRaw}`;
  if (!safeEqual(Buffer.from(sig, "base64url"), mac(key, `${purpose}|${payload}`))) return null;
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || exp <= now) return null;
  const scope = scopeRaw.split("+").filter(isLockedSlug);
  return scope.length ? { exp, scope } : null;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

export function createSessionToken(
  scope: readonly LockedSlug[],
  {
    now = nowSeconds(),
    env = process.env,
  }: { now?: number; env?: Record<string, string | undefined> } = {},
): string | null {
  const key = secretKey(env);
  if (!key || scope.length === 0) return null;
  return sign("session", [...new Set(scope)].sort(), now + SESSION_TTL_SECONDS, key);
}

export function readSession(
  token: string | undefined,
  {
    now = nowSeconds(),
    env = process.env,
  }: { now?: number; env?: Record<string, string | undefined> } = {},
): { exp: number; scope: LockedSlug[] } | null {
  const key = secretKey(env);
  if (!key || !token) return null;
  return verify("session", token, key, now);
}

export function hasAccess(token: string | undefined, slug: LockedSlug, now?: number): boolean {
  return readSession(token, { now })?.scope.includes(slug) ?? false;
}

export function createMagicToken(
  slug: LockedSlug,
  {
    now = nowSeconds(),
    ttl = MAGIC_LINK_TTL_SECONDS,
    env = process.env,
  }: { now?: number; ttl?: number; env?: Record<string, string | undefined> } = {},
): string | null {
  const key = secretKey(env);
  return key ? sign("link", [slug], now + ttl, key) : null;
}

export function readMagicToken(
  token: string | undefined | null,
  {
    now = nowSeconds(),
    env = process.env,
  }: { now?: number; env?: Record<string, string | undefined> } = {},
): { exp: number; scope: LockedSlug[] } | null {
  const key = secretKey(env);
  if (!key || !token) return null;
  return verify("link", token, key, now);
}

export function sessionCookie(token: string, secure: boolean) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function isGateConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return (
    secretKey(env) !== null &&
    Boolean(
      env.PORTFOLIO_PASSWORD_HASH ||
      LOCKED_SLUGS.some((slug) => env[`PORTFOLIO_PASSWORD_${slug.toUpperCase()}_HASH`]),
    )
  );
}

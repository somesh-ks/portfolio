import { describe, expect, test } from "bun:test";
import {
  createMagicToken,
  createSessionToken,
  hashPassword,
  readMagicToken,
  readSession,
  scopeForPassword,
  SESSION_TTL_SECONDS,
  verifyPassword,
} from "@/lib/auth";

const SECRET = Buffer.alloc(32, 7).toString("base64");
const env = { PORTFOLIO_COOKIE_SECRET: SECRET } as Record<string, string | undefined>;
const NOW = 1_800_000_000;
// Low cost factor keeps the suite fast; production hashes use 2^17.
const FAST = 14;

describe("password hashing (scrypt)", () => {
  test("accepts the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery", FAST);
    expect(hash.startsWith("scrypt:14:8:1:")).toBe(true);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batterY", hash)).toBe(false);
  });

  test("rejects malformed or downgraded hashes", async () => {
    expect(await verifyPassword("x", "sha256:abc")).toBe(false);
    expect(await verifyPassword("x", "scrypt:4:8:1:AAAA:BBBB")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });

  test("a per-slug password opens only that slug; the shared one opens all", async () => {
    const shared = await hashPassword("shared-password", FAST);
    const royc = await hashPassword("royc-only-password", FAST);
    const keys = { PORTFOLIO_PASSWORD_HASH: shared, PORTFOLIO_PASSWORD_ROYC_HASH: royc };
    expect(await scopeForPassword("royc-only-password", "royc", keys)).toEqual(["royc"]);
    expect(await scopeForPassword("royc-only-password", "luminovo", keys)).toEqual([]);
    expect(await scopeForPassword("shared-password", "luminovo", keys)).toEqual([
      "royc",
      "luminovo",
    ]);
    expect(await scopeForPassword("", "royc", keys)).toEqual([]);
  });
});

describe("session cookie (HMAC)", () => {
  test("round-trips scope and expiry", () => {
    const token = createSessionToken(["royc"], { now: NOW, env });
    expect(readSession(token ?? "", { now: NOW + 10, env })).toEqual({
      exp: NOW + SESSION_TTL_SECONDS,
      scope: ["royc"],
    });
  });

  test("rejects a tampered scope, signature or expiry", () => {
    const token = createSessionToken(["royc"], { now: NOW, env }) ?? "";
    const [version, exp, , signature] = token.split(".");
    expect(
      readSession(`${version}.${exp}.royc+luminovo.${signature}`, { now: NOW, env }),
    ).toBeNull();
    expect(
      readSession(`${version}.${Number(exp) + 999}.royc.${signature}`, { now: NOW, env }),
    ).toBeNull();
    expect(readSession(`${token.slice(0, -2)}xx`, { now: NOW, env })).toBeNull();
  });

  test("expires", () => {
    const token = createSessionToken(["royc"], { now: NOW, env }) ?? "";
    expect(readSession(token, { now: NOW + SESSION_TTL_SECONDS + 1, env })).toBeNull();
  });

  test("rejects tokens signed with another secret", () => {
    const token = createSessionToken(["royc"], { now: NOW, env }) ?? "";
    const other = { PORTFOLIO_COOKIE_SECRET: Buffer.alloc(32, 9).toString("base64") };
    expect(readSession(token, { now: NOW, env: other })).toBeNull();
  });

  test("refuses to sign without a strong secret", () => {
    expect(
      createSessionToken(["royc"], { now: NOW, env: { PORTFOLIO_COOKIE_SECRET: "short" } }),
    ).toBeNull();
    expect(createSessionToken(["royc"], { now: NOW, env: {} })).toBeNull();
  });
});

describe("magic links", () => {
  test("a link token is not a session token, and vice versa", () => {
    const link = createMagicToken("royc", { now: NOW, ttl: 3600, env }) ?? "";
    const session = createSessionToken(["royc"], { now: NOW, env }) ?? "";
    expect(readMagicToken(link, { now: NOW, env })?.scope).toEqual(["royc"]);
    expect(readSession(link, { now: NOW, env })).toBeNull();
    expect(readMagicToken(session, { now: NOW, env })).toBeNull();
  });

  test("expiry is covered by the signature", () => {
    const link = createMagicToken("royc", { now: NOW, ttl: 3600, env }) ?? "";
    expect(readMagicToken(link, { now: NOW + 3601, env })).toBeNull();
  });

  test("editing the expiry or scope breaks the signature", () => {
    const link = createMagicToken("royc", { now: NOW, ttl: 3600, env }) ?? "";
    const [version, exp, scope, sig] = link.split(".");
    const later = [version, String(Number(exp) + 86_400), scope, sig].join(".");
    const wider = [version, exp, "royc+luminovo", sig].join(".");
    expect(readMagicToken(later, { now: NOW, env })).toBeNull();
    expect(readMagicToken(wider, { now: NOW, env })).toBeNull();
  });
});

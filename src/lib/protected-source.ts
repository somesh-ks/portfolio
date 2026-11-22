/**
 * Loads gated case-study bodies and media from OUTSIDE git.
 *
 * PROTECTED_CONTENT_SOURCE is either a directory (default content/protected,
 * gitignored) or an https base URL (Vercel Blob, a private bucket, a raw URL
 * from a private repo). Layout under the source:
 *   <slug>.mdx
 *   media/<slug>/<file>
 * Callers must check the session BEFORE calling anything here.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { LockedSlug } from "./site";

const MEDIA_FILE = /^[a-z0-9][a-z0-9_-]{0,80}\.(avif|webp|png|jpg|jpeg|mp4|webm)$/;
const MEDIA_TYPES: Record<string, string> = {
  avif: "image/avif",
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  mp4: "video/mp4",
  webm: "video/webm",
};

function source(env: Record<string, string | undefined> = process.env): string {
  return env.PROTECTED_CONTENT_SOURCE || path.join(process.cwd(), "content", "protected");
}

/** Only a Vercel Blob host may receive the project's Blob read-write token. */
function tokenFor(url: URL, env: Record<string, string | undefined>): string | undefined {
  if (env.PROTECTED_CONTENT_TOKEN) return env.PROTECTED_CONTENT_TOKEN;
  return url.hostname.endsWith(".blob.vercel-storage.com") ? env.BLOB_READ_WRITE_TOKEN : undefined;
}

// Remote reads are cached per server instance so each page view doesn't
// spend a store operation (Hobby Blob pauses after its monthly allowance).
// Safe because callers check the session before reading.
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { at: number; body: Buffer }>();

async function fetchRemote(url: URL, env: Record<string, string | undefined>) {
  const key = url.href;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.body;
  const token = tokenFor(url, env);
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  if (!response.ok) {
    // Status and path only, never the token: tells a paused store (429/403)
    // apart from a missing file (404) in the Vercel logs.
    console.error(`protected source: ${response.status} for ${url.pathname}`);
    return null;
  }
  const body = Buffer.from(await response.arrayBuffer());
  cache.set(key, { at: Date.now(), body });
  return body;
}

async function read(
  relativePath: string,
  env: Record<string, string | undefined> = process.env,
): Promise<Buffer | null> {
  const base = source(env);
  try {
    if (base.startsWith("https://")) {
      return await fetchRemote(new URL(relativePath, base.endsWith("/") ? base : `${base}/`), env);
    }
    // Never trace the protected source into the server bundle.
    return await readFile(path.join(/*turbopackIgnore: true*/ base, relativePath));
  } catch (error) {
    console.error(`protected source: could not read ${relativePath}`, error);
    return null;
  }
}

export async function loadProtectedBody(
  slug: LockedSlug,
  env: Record<string, string | undefined> = process.env,
): Promise<string | null> {
  const buffer = await read(`${slug}.mdx`, env);
  return buffer ? buffer.toString("utf8") : null;
}

export function isMediaFileName(file: string): boolean {
  return MEDIA_FILE.test(file);
}

export async function loadProtectedMedia(
  slug: LockedSlug,
  file: string,
  env: Record<string, string | undefined> = process.env,
): Promise<{ body: Buffer; type: string } | null> {
  if (!isMediaFileName(file)) return null;
  const body = await read(`media/${slug}/${file}`, env);
  const extension = file.split(".").pop() ?? "";
  return body ? { body, type: MEDIA_TYPES[extension] ?? "application/octet-stream" } : null;
}

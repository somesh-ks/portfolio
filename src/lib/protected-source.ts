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

function source(env = process.env): string {
  return env.PROTECTED_CONTENT_SOURCE || path.join(process.cwd(), "content", "protected");
}

async function read(relativePath: string, env = process.env): Promise<Buffer | null> {
  const base = source(env);
  try {
    if (base.startsWith("https://")) {
      const url = new URL(relativePath, base.endsWith("/") ? base : `${base}/`);
      // A Vercel Blob store connected to the project provides BLOB_READ_WRITE_TOKEN.
      const token = env.PROTECTED_CONTENT_TOKEN || env.BLOB_READ_WRITE_TOKEN;
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      return response.ok ? Buffer.from(await response.arrayBuffer()) : null;
    }
    // Never trace the protected source into the server bundle.
    return await readFile(path.join(/*turbopackIgnore: true*/ base, relativePath));
  } catch {
    return null;
  }
}

export async function loadProtectedBody(
  slug: LockedSlug,
  env = process.env,
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
  env = process.env,
): Promise<{ body: Buffer; type: string } | null> {
  if (!isMediaFileName(file)) return null;
  const body = await read(`media/${slug}/${file}`, env);
  const extension = file.split(".").pop() ?? "";
  return body ? { body, type: MEDIA_TYPES[extension] ?? "application/octet-stream" } : null;
}

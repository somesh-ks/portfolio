import type { NextRequest } from "next/server";
import { hasAccess, SESSION_COOKIE } from "@/lib/auth";
import { MAX_CHUNK, parseRange } from "@/lib/byte-range";
import { isMediaFileName, loadProtectedMedia } from "@/lib/protected-source";
import { isLockedSlug } from "@/lib/site";

export const dynamic = "force-dynamic";

const PRIVATE = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; file: string }> },
) {
  const { slug, file } = await params;
  // Same 401 for unknown slugs and bad names, so the route reveals nothing.
  if (
    !isLockedSlug(slug) ||
    !isMediaFileName(file) ||
    !hasAccess(request.cookies.get(SESSION_COOKIE)?.value, slug)
  ) {
    return new Response("Unauthorized", { status: 401, headers: PRIVATE });
  }
  const media = await loadProtectedMedia(slug, file);
  if (!media) return new Response("Not found", { status: 404, headers: PRIVATE });
  const size = media.body.length;
  const base = {
    ...PRIVATE,
    "Content-Type": media.type,
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };
  const range = parseRange(request.headers.get("range"), size);
  if (range === "unsatisfiable") {
    return new Response(null, {
      status: 416,
      headers: { ...base, "Content-Range": `bytes */${size}` },
    });
  }
  // Large files always go out in slices so the response fits the function limit.
  const slice = range ?? (size > MAX_CHUNK ? { start: 0, end: MAX_CHUNK - 1 } : null);
  if (slice) {
    const body = media.body.subarray(slice.start, slice.end + 1);
    return new Response(new Uint8Array(body), {
      status: 206,
      headers: {
        ...base,
        "Content-Range": `bytes ${slice.start}-${slice.end}/${size}`,
        "Content-Length": String(body.length),
      },
    });
  }
  return new Response(new Uint8Array(media.body), {
    headers: { ...base, "Content-Length": String(size) },
  });
}

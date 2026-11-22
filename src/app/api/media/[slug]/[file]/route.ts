import type { NextRequest } from "next/server";
import { hasAccess, SESSION_COOKIE } from "@/lib/auth";
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
  const unauthorized = () => new Response("Unauthorized", { status: 401, headers: PRIVATE });
  // Same 401 for every failure (unknown slug, bad name, no session, missing
  // file), so the route never reveals which files exist.
  if (
    !isLockedSlug(slug) ||
    !isMediaFileName(file) ||
    !hasAccess(request.cookies.get(SESSION_COOKIE)?.value, slug)
  ) {
    return unauthorized();
  }
  const media = await loadProtectedMedia(slug, file);
  if (!media) return unauthorized();
  return new Response(new Uint8Array(media.body), {
    headers: {
      ...PRIVATE,
      "Content-Type": media.type,
      "Content-Length": String(media.body.length),
      "X-Content-Type-Options": "nosniff",
    },
  });
}

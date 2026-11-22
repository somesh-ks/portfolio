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
  return new Response(new Uint8Array(media.body), {
    headers: {
      ...PRIVATE,
      "Content-Type": media.type,
      "Content-Length": String(media.body.length),
      "X-Content-Type-Options": "nosniff",
    },
  });
}

import { NextResponse, type NextRequest } from "next/server";
import { sessionCookie } from "@/lib/auth";
import { isLockedSlug } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Same-origin check: browsers always send Origin on cross-site POSTs. */
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

/** Signs this browser out of every locked study and returns to the gate. */
export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };
  if (!sameOrigin(request)) return new NextResponse("Forbidden", { status: 403, headers });
  const form = await request.formData().catch(() => null);
  const slug = String(form?.get("slug") ?? "");
  const target = new URL(isLockedSlug(slug) ? `/work/${slug}` : "/", request.nextUrl.origin);
  const response = NextResponse.redirect(target, { status: 303, headers });
  const secure =
    request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  response.cookies.set({ ...sessionCookie("", secure), maxAge: 0 });
  return response;
}

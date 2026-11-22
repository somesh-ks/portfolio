import { NextResponse, type NextRequest } from "next/server";
import {
  createSessionToken,
  FAILED_ATTEMPT_DELAY_MS,
  isGateConfigured,
  readSession,
  scopeForPassword,
  SESSION_COOKIE,
  sessionCookie,
} from "@/lib/auth";
import { isLockedSlug } from "@/lib/site";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
};

function isSecure(request: NextRequest): boolean {
  return (
    request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https"
  );
}

/** Same-origin check: browsers always send Origin on cross-site POSTs. */
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

function respond(
  request: NextRequest,
  slug: string,
  outcome: "ok" | "failed" | "unavailable" | "bad-request",
) {
  const wantsJson = request.headers.get("accept")?.includes("application/json");
  const status = { ok: 200, failed: 401, unavailable: 503, "bad-request": 400 }[outcome];
  if (wantsJson) return NextResponse.json({ ok: outcome === "ok" }, { status, headers: NO_STORE });
  // No-JS form post: send the visitor back to the page (303 turns POST into GET).
  const target = new URL(isLockedSlug(slug) ? `/work/${slug}` : "/", request.nextUrl.origin);
  if (outcome !== "ok")
    target.searchParams.set("unlock", outcome === "unavailable" ? "unavailable" : "failed");
  return NextResponse.redirect(target, { status: 303, headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return new NextResponse("Forbidden", { status: 403, headers: NO_STORE });
  const form = await request.formData().catch(() => null);
  const slug = String(form?.get("slug") ?? "");
  const password = String(form?.get("password") ?? "");
  if (!isLockedSlug(slug)) return respond(request, slug, "bad-request");
  if (!isGateConfigured()) return respond(request, slug, "unavailable");

  const scope = await scopeForPassword(password, slug);
  if (!scope.length) {
    await new Promise((resolve) => setTimeout(resolve, FAILED_ATTEMPT_DELAY_MS));
    return respond(request, slug, "failed");
  }

  // Keep anything the visitor had already unlocked.
  const existing = readSession(request.cookies.get(SESSION_COOKIE)?.value)?.scope ?? [];
  const token = createSessionToken([...existing, ...scope]);
  if (!token) return respond(request, slug, "unavailable");
  const response = respond(request, slug, "ok");
  response.cookies.set(sessionCookie(token, isSecure(request)));
  return response;
}

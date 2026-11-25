/**
 * Request proxy (Next.js 16, Node runtime):
 * 1. Markdown for agents: /path.md, or Accept preferring text/markdown,
 *    rewrites to the static /api/md mirror.
 * 2. Magic links: /work/<slug>?token=... is verified, swapped for the
 *    HttpOnly session cookie, and redirected to the clean URL.
 * 3. Unlocked locked pages get no-store and noindex headers.
 * Every HTML response also carries Vary: Accept, since the same URL can
 * answer with HTML or Markdown.
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  createSessionToken,
  hasAccess,
  readMagicToken,
  readSession,
  SESSION_COOKIE,
  sessionCookie,
} from "@/lib/auth";
import { isLockedSlug } from "@/lib/site";

const PAGE_PATH = /^\/(?:(?:work|experiments|projects)\/[a-z0-9-]+|resume)?\/?$/;
const SPRING_PATH = /^\/spring(?:\/app|\/view)?\/?$/;

function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  let markdown = 0;
  let html = 0;
  for (const part of accept.split(",")) {
    const [type = "", ...params] = part.trim().toLowerCase().split(";");
    const q = Number(params.find((param) => param.trim().startsWith("q="))?.split("=")[1] ?? 1);
    if (type.trim() === "text/markdown") markdown = Math.max(markdown, q);
    if (type.trim() === "text/html") html = Math.max(html, q);
  }
  return markdown > 0 && markdown >= html;
}

function markdownRewrite(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = `/api/md${pathname === "/" ? "" : pathname}`;
  url.search = "";
  return NextResponse.rewrite(url);
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname.endsWith(".md")) {
    const page = pathname.slice(0, -3);
    return markdownRewrite(request, page === "/index" ? "/" : page);
  }
  const isPage = PAGE_PATH.test(pathname) || SPRING_PATH.test(pathname);
  if (isPage && prefersMarkdown(request.headers.get("accept"))) {
    return markdownRewrite(request, pathname.replace(/\/$/, "") || "/");
  }

  const slug = /^\/work\/([a-z0-9-]+)\/?$/.exec(pathname)?.[1] ?? "";
  if (isLockedSlug(slug)) {
    const token = searchParams.get("token");
    if (token !== null) {
      const clean = request.nextUrl.clone();
      clean.search = "";
      const response = NextResponse.redirect(clean, 303);
      response.headers.set("Referrer-Policy", "no-referrer");
      response.headers.set("Cache-Control", "private, no-store");
      const link = readMagicToken(token);
      if (link?.scope.includes(slug)) {
        const existing = readSession(request.cookies.get(SESSION_COOKIE)?.value)?.scope ?? [];
        const session = createSessionToken([...existing, slug]);
        const secure =
          request.nextUrl.protocol === "https:" ||
          request.headers.get("x-forwarded-proto") === "https";
        if (session) response.cookies.set(sessionCookie(session, secure));
      }
      return response;
    }
    const response = NextResponse.next();
    response.headers.set("Vary", "Accept, Cookie");
    if (hasAccess(request.cookies.get(SESSION_COOKIE)?.value, slug)) {
      response.headers.set("Cache-Control", "private, no-store, max-age=0");
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    }
    return response;
  }

  const response = NextResponse.next();
  if (isPage) response.headers.set("Vary", "Accept");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/|api/|favicon|icon|apple-icon|opengraph-image|previews/|llms|robots.txt|sitemap.xml).*)",
  ],
};

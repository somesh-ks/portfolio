/**
 * NDA boundary: no protected sentinel may reach any public export or any
 * unauthenticated response. The fixtures in tests/fixtures/protected stand
 * in for the real (out-of-git) protected bodies.
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { FIXTURE_SOURCE, NDA_SENTINELS } from "../fixtures/sentinels";

process.env.PROTECTED_CONTENT_SOURCE = FIXTURE_SOURCE;
process.env.PORTFOLIO_COOKIE_SECRET = Buffer.alloc(32, 3).toString("base64");

const { llmsFullTxt, llmsTxt, markdownForPath, markdownPaths, NDA_NOTICE } =
  await import("@/lib/agent-exports");
const { createSessionToken, SESSION_COOKIE } = await import("@/lib/auth");
const { loadProtectedBody } = await import("@/lib/protected-source");
const media = await import("@/app/api/media/[slug]/[file]/route");

function expectNoSentinel(text: string) {
  for (const sentinel of NDA_SENTINELS) expect(text).not.toContain(sentinel);
}

const mediaParams = (slug: string, file: string) => ({ params: Promise.resolve({ slug, file }) });

describe("fixtures are wired up", () => {
  beforeAll(async () => {
    // Guard against a vacuous pass: the sentinel must be loadable server-side.
    expect(await loadProtectedBody("royc")).toContain(NDA_SENTINELS[0]);
  });

  test("llms.txt carries no protected text and follows the llmstxt.org shape", () => {
    const text = llmsTxt();
    expectNoSentinel(text);
    expect(text.startsWith("# Somesh Kesarla Suresh\n\n> ")).toBe(true);
    expect(text).toContain("## Enterprise Case Studies (Summaries Only)");
  });

  test("llms-full.txt carries no protected text but keeps the public teasers", () => {
    const text = llmsFullTxt();
    expectNoSentinel(text);
    expect(text).toContain(NDA_NOTICE);
  });

  test("every Markdown mirror is clean, JSX-free Markdown", () => {
    for (const path of markdownPaths()) {
      const markdown = markdownForPath(path);
      expect(markdown, path).toBeString();
      expectNoSentinel(markdown ?? "");
      expect(markdown ?? "", path).not.toMatch(/<[A-Z][A-Za-z]+[\s/>]/);
      expect(markdown ?? "", path).not.toMatch(/^(import|export) /m);
    }
  });

  test("locked mirrors return only the teaser and the NDA notice", () => {
    for (const path of ["/work/royc", "/work/luminovo"]) {
      const markdown = markdownForPath(path) ?? "";
      expect(markdown).toContain(NDA_NOTICE);
      expectNoSentinel(markdown);
    }
  });
});

describe("/api/media", () => {
  test("returns 401 without a session cookie", async () => {
    const response = await media.GET(
      new NextRequest("http://localhost/api/media/royc/hero.webp"),
      mediaParams("royc", "hero.webp"),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  test("returns 401 for a session scoped to another case study", async () => {
    const token = createSessionToken(["luminovo"]) ?? "";
    const request = new NextRequest("http://localhost/api/media/royc/hero.webp", {
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
    });
    expect((await media.GET(request, mediaParams("royc", "hero.webp"))).status).toBe(401);
  });

  test("rejects path traversal even with a valid session", async () => {
    const token = createSessionToken(["royc"]) ?? "";
    const request = new NextRequest("http://localhost/api/media/royc/x", {
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
    });
    expect((await media.GET(request, mediaParams("royc", "../royc.mdx"))).status).toBe(401);
  });

  test("streams media privately with a valid session", async () => {
    const token = createSessionToken(["royc"]) ?? "";
    const request = new NextRequest("http://localhost/api/media/royc/hero.webp", {
      headers: { cookie: `${SESSION_COOKIE}=${token}` },
    });
    const response = await media.GET(request, mediaParams("royc", "hero.webp"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
  });
});

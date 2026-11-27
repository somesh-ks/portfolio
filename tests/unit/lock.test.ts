import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/lock/route";
import { SESSION_COOKIE } from "@/lib/auth";

function lock(slug: string, headers: Record<string, string> = {}) {
  const body = new FormData();
  body.set("slug", slug);
  return POST(
    new NextRequest("https://someshks.com/api/lock", {
      method: "POST",
      body,
      headers: { Cookie: `${SESSION_COOKIE}=v1.1.royc.sig`, ...headers },
    }),
  );
}

describe("POST /api/lock", () => {
  test("clears the session cookie and returns to the gate", async () => {
    const response = await lock("royc", { Origin: "https://someshks.com" });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://someshks.com/work/royc");
    expect(response.headers.get("cache-control")).toContain("no-store");
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${SESSION_COOKIE}=;`);
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/");
  });

  test("an unknown slug still signs out, then goes home", async () => {
    const response = await lock("../evil");
    expect(response.headers.get("location")).toBe("https://someshks.com/");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  test("a cross-site post is refused and leaves the cookie alone", async () => {
    const response = await lock("royc", { Origin: "https://evil.example" });
    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

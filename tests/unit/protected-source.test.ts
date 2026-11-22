import { afterEach, describe, expect, mock, test } from "bun:test";
import { loadProtectedBody } from "../../src/lib/protected-source.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function captureAuth() {
  const seen: (string | null)[] = [];
  globalThis.fetch = mock(async (_url: string | URL | Request, init?: RequestInit) => {
    seen.push(new Headers(init?.headers).get("authorization"));
    return new Response("body");
  }) as unknown as typeof fetch;
  return seen;
}

describe("remote protected source", () => {
  test("the Blob token only goes to Vercel Blob hosts", async () => {
    const seen = captureAuth();
    const blob = "secret-blob-token";
    await loadProtectedBody("royc", {
      PROTECTED_CONTENT_SOURCE: "https://elsewhere.example.com/a",
      BLOB_READ_WRITE_TOKEN: blob,
    });
    await loadProtectedBody("royc", {
      PROTECTED_CONTENT_SOURCE: "https://abc.private.blob.vercel-storage.com",
      BLOB_READ_WRITE_TOKEN: blob,
    });
    expect(seen).toEqual([null, `Bearer ${blob}`]);
  });

  test("repeat reads are served from memory", async () => {
    const seen = captureAuth();
    const env = { PROTECTED_CONTENT_SOURCE: "https://cache-test.example.com" };
    expect(await loadProtectedBody("luminovo", env)).toBe("body");
    expect(await loadProtectedBody("luminovo", env)).toBe("body");
    expect(seen).toHaveLength(1);
  });
});

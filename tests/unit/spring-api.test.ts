import { describe, expect, test } from "bun:test";
import { GET, POST } from "@/app/api/spring/route";
import { decodeInput } from "@/lib/spring/state";

const get = (q: string) => GET(new Request(`https://someshks.com/api/spring?${q}`));

describe("/api/spring", () => {
  test("seed params build a system with every file and a link that rebuilds it", async () => {
    const res = get("primary=%23e11d48&name=Rose&font=Geist");
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const body = (await res.json()) as {
      input: { name: string; type: { body: string } };
      link: string;
      files: { path: string; content: string }[];
      notes: string[];
    };
    expect(body.input.name).toBe("Rose");
    expect(body.input.type.body).toBe("Geist");
    expect(body.files.map((f) => f.path)).toEqual(
      expect.arrayContaining([
        "tokens.css",
        "tokens.json",
        "theme.css",
        "DESIGN.md",
        "spring.json",
      ]),
    );
    const s = new URL(body.link).searchParams.get("s");
    expect(decodeInput(s)?.name).toBe("Rose");
    expect(body.notes).toEqual([]);
  });

  test("any Google font fills its metadata", async () => {
    const body = (await get("primary=teal&font=Roboto%20Slab").json()) as {
      input: { type: { body: string; extra?: Record<string, unknown> } };
    };
    expect(body.input.type.body).toBe("Roboto Slab");
    expect(body.input.type.extra?.["Roboto Slab"]).toBeDefined();
  });

  test("file= returns one file as text", async () => {
    const res = get("primary=%23e11d48&file=theme.css");
    expect(res.headers.get("Content-Type")).toContain("text/css");
    expect(await res.text()).toContain("--primary-foreground");
  });

  test("errors are JSON with the schema link", async () => {
    const res = get("");
    expect(res.status).toBe(400);
    expect(((await res.json()) as { schema: string }).schema).toContain("schema.json");
    expect(get("primary=%23e11d48&file=nope").status).toBe(404);
  });

  test("POST takes spring.json and reports clamped fields", async () => {
    const res = await POST(
      new Request("https://someshks.com/api/spring", {
        method: "POST",
        body: JSON.stringify({
          name: "Big",
          primary: "#2563eb",
          density: 9,
          type: { body: "Nope Sans" },
        }),
      }),
    );
    const body = (await res.json()) as { notes: string[]; input: { density: number } };
    expect(res.status).toBe(200);
    expect(body.input.density).toBe(0.5);
    expect(body.notes.join(" ")).toContain("density");
    expect(body.notes.join(" ")).toContain("Nope Sans");
  });

  test("POST rejects bodies that aren't JSON or are too big", async () => {
    const post = (body: string) =>
      POST(new Request("https://x/api/spring", { method: "POST", body }));
    expect((await post("nope")).status).toBe(400);
    expect((await post("x".repeat(70_000))).status).toBe(413);
  });
});

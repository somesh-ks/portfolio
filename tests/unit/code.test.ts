import { describe, expect, test } from "bun:test";
import { codeToHast } from "shiki";
import { codeMeta, codeTheme } from "@/lib/shiki";

type Node = { properties?: Record<string, unknown>; children?: Node[] };

async function pre(code: string, lang: string, meta = "") {
  const root = (await codeToHast(code, {
    lang,
    theme: codeTheme,
    meta: { __raw: meta },
    transformers: [codeMeta()],
  })) as Node;
  return root.children?.[0] as Node;
}

describe("code blocks", () => {
  test("a title and the raw source travel on the <pre>", async () => {
    const node = await pre("const a = 1;", "ts", 'title="app.ts"');
    expect(node.properties?.["data-title"]).toBe("app.ts");
    expect(node.properties?.["data-code"]).toBe("const a = 1;");
    expect(node.properties?.["data-terminal"]).toBeUndefined();
    expect(node.properties?.tabindex).toBe(0);
  });

  test("terminal blocks copy only the commands, without the prompt", async () => {
    const node = await pre("$ bun install\ndone in 1s\n$ bun test", "sh", "terminal");
    expect(node.properties?.["data-terminal"]).toBe("");
    expect(node.properties?.["data-code"]).toBe("bun install\nbun test");
  });

  test("colours come from CSS variables, so code follows the site theme", async () => {
    const node = await pre("const a = 1;", "ts");
    expect(JSON.stringify(node)).toContain("var(--shiki-token-keyword)");
    expect(JSON.stringify(node)).not.toMatch(/#[0-9a-f]{6}/i);
  });
});

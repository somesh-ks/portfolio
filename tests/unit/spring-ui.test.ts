import { describe, expect, test } from "bun:test";
import { SCHEMA_URL, writeInput } from "@/lib/spring/io";
import { VIEW_SCHEMA_URL } from "@/lib/spring/tokens";
import { DEFAULT_INPUT } from "@/lib/spring/system";
import { importRoute } from "@/components/experiments/spring/store";
import {
  asView,
  defaultMode,
  encodePayload,
  LENGTH_SENTINEL,
  lengthOf,
  looksBinary,
  valuesFor,
} from "@/components/experiments/spring/view-model";

describe("importRoute", () => {
  test("spring.json by its schema, or by its own fields", () => {
    expect(importRoute(JSON.parse(writeInput(DEFAULT_INPUT)))).toBe("spring");
    expect(importRoute({ $schema: SCHEMA_URL })).toBe("spring");
    expect(importRoute({ name: "Acme", primary: "#3b82f6" })).toBe("spring");
    expect(importRoute({ v: 1, density: 0.5 })).toBe("spring");
  });
  test("a DTCG tokens.json with its own $schema goes to the audit", () => {
    const dtcg = {
      $schema: "https://www.designtokens.org/schemas/2025.10/format.json",
      color: { primary: { $type: "color", $value: "#e11d48" } },
      type: { body: { $type: "fontFamily", $value: "Inter" } },
    };
    expect(importRoute(dtcg)).toBe("audit");
    const { $schema: _, ...bare } = dtcg;
    expect(importRoute(bare)).toBe("audit");
  });
  test("a Spring View file is read as a view, with or without its schema", () => {
    const view = { v: 1, modes: ["light"], tokens: { primary: { light: "#e11d48" } } };
    expect(importRoute(view)).toBe("view");
    expect(importRoute({ $schema: VIEW_SCHEMA_URL, ...view })).toBe("view");
  });
  test("anything else goes to the audit", () => {
    expect(importRoute(undefined)).toBe("audit");
    expect(importRoute([1, 2])).toBe("audit");
    expect(importRoute({ tokens: {}, name: "x" })).toBe("audit");
    expect(importRoute({ colors: { primary: "#000" } })).toBe("audit");
  });
});

describe("view helpers", () => {
  test("the default mode follows the site theme", () => {
    expect(defaultMode(["dark", "light"], false)).toBe("light");
    expect(defaultMode(["dark", "light"], true)).toBe("dark");
    expect(defaultMode(["default", "night"], true)).toBe("night");
    expect(defaultMode(["dark"], false)).toBe("dark");
  });
  test("a length probe that inherited the sentinel reads as unknown", () => {
    expect(lengthOf(LENGTH_SENTINEL)).toBeUndefined();
    expect(lengthOf("10%")).toBeUndefined();
    expect(lengthOf("")).toBeUndefined();
    expect(lengthOf("16px")).toBe(16);
    expect(lengthOf("-2.5px")).toBe(-2.5);
  });
  test("binary text is spotted by its NUL bytes", () => {
    expect(looksBinary("\u0089PNG\r\n\u001a\n\u0000\u0000")).toBe(true);
    expect(looksBinary(":root { --a: 1px; }")).toBe(false);
  });
  test("var() is prefixed whatever its case", () => {
    const view = {
      v: 1 as const,
      name: "",
      modes: ["light"],
      sources: [],
      tokens: { a: { light: "VAR(--b)" } },
    };
    expect(valuesFor(view as never, "light")).toEqual([["--sv-a", "var(--sv-b)"]]);
  });
  test("a mode named like an Object method falls back to the default mode", () => {
    const view = {
      v: 1,
      name: "",
      modes: ["light", "toString"],
      sources: [],
      tokens: { a: { light: "red" } },
    };
    expect(valuesFor(view as never, "toString")).toEqual([["--sv-a", "red"]]);
  });
  test("a downloaded .view.json reads back as itself", () => {
    const file = {
      $schema: VIEW_SCHEMA_URL,
      v: 1,
      modes: ["light"],
      tokens: { primary: { light: "#e11d48" } },
    };
    expect(asView(JSON.stringify(file))?.tokens).toEqual({ primary: { light: "#e11d48" } });
    expect(asView(":root { --a: 1px; }")).toBeNull();
    expect(asView('{"color":{"$value":"#000"}}')).toBeNull();
  });
  test("no share link for a view the decoder would refuse", async () => {
    const tokens: Record<string, Record<string, string>> = {};
    for (let i = 0; i < 3000; i++) tokens[`t${i}`] = { light: "x".repeat(800) };
    const view = { v: 1 as const, name: "", modes: ["light"], sources: [], tokens };
    await expect(encodePayload(view as never)).rejects.toThrow("Download JSON");
  });
});

describe("resetInput", () => {
  test("drops every system param from the URL and keeps the rest", async () => {
    let url =
      "https://someshks.com/spring?s=abc&j=%7B%7D&primary=red&name=X&font=Inter&body=a&heading=b&mono=c&base=16&ratio=1.2&contrast=aa&styling=x&building=y&tab=color#top";
    const g = globalThis as Record<string, unknown>;
    const saved = { location: g.location, history: g.history, localStorage: g.localStorage };
    g.location = {
      get href() {
        return url;
      },
      search: "",
    };
    g.history = {
      state: null,
      replaceState: (_: unknown, __: string, u: URL) => (url = String(u)),
    };
    g.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
    try {
      const { resetInput } = await import("@/components/experiments/spring/store");
      resetInput();
      expect(url).toBe("https://someshks.com/spring?tab=color#top");
    } finally {
      Object.assign(g, saved);
    }
  });
});

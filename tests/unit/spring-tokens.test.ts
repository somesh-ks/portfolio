import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  colorOf,
  extract,
  groupOf,
  isColor,
  kind,
  kindOf,
  MAX_TOKENS,
  pairs,
  readView,
  resolve,
  type View,
} from "@/lib/spring/tokens";

const DIRS = ["tests/fixtures/audit", "tests/fixtures/tokens"].map((d) =>
  join(import.meta.dir, "../..", d),
);
const read = (name: string) => {
  for (const d of DIRS) {
    try {
      return readFileSync(join(d, name), "utf8");
    } catch {}
  }
  throw new Error(`no fixture ${name}`);
};
const one = (name: string, path = name) => extract([{ path, text: read(name) }]);
const css = (text: string) => extract([{ path: "x.css", text }]);
const val = (v: View, name: string, mode = "light") => v.tokens[name]?.[mode];

describe("css: shadcn v4", () => {
  const v = one("shadcn-v4.css");
  test("light and dark modes, light first", () => {
    expect(v.modes).toEqual(["light", "dark"]);
    expect(val(v, "background")).toBe("oklch(1 0 0)");
    expect(val(v, "background", "dark")).toBe("oklch(0.145 0 0)");
    expect(val(v, "border", "dark")).toBe("oklch(1 0 0 / 10%)");
  });
  test("@theme inline aliases are kept as var() and resolve per mode", () => {
    expect(val(v, "color-primary")).toBe("var(--primary)");
    expect(resolve(v, "color-primary", "light")).toBe("oklch(0.205 0 0)");
    expect(resolve(v, "color-primary", "dark")).toBe("oklch(0.922 0 0)");
  });
  test("@custom-variant, @import and @apply add nothing", () => {
    expect(Object.keys(v.tokens).some((k) => /variant|apply|import/.test(k))).toBe(false);
    expect(v.scoped).toBeUndefined();
  });
  test("calc() with a nested var stays whole", () => {
    expect(val(v, "radius-sm")).toBe("calc(var(--radius) - 4px)");
  });
});

describe("css: tailwind v4 @theme", () => {
  const v = one("tw4-theme.css");
  test("keeps namespaces and sub-properties", () => {
    expect(val(v, "color-brand-500")).toBe("oklch(0.62 0.19 259)");
    expect(val(v, "text-sm")).toBe("0.875rem");
    expect(val(v, "text-sm--line-height")).toBe("1.25rem");
    expect(val(v, "font-sans")).toBe('"Inter", ui-sans-serif, system-ui');
    expect(val(v, "ease-snappy")).toBe("cubic-bezier(0.2, 0, 0, 1)");
  });
  test("classifies by namespace", () => {
    expect(kind("color-brand-500", val(v, "color-brand-500"))).toBe("color");
    expect(kind("text-sm", "0.875rem")).toBe("size");
    expect(kind("text-sm--line-height", "1.25rem")).toBe("leading");
    expect(kind("font-sans", val(v, "font-sans"))).toBe("font");
    expect(kind("breakpoint-3xl", "120rem")).toBe("breakpoint");
    expect(kind("ease-snappy", "cubic-bezier(0.2, 0, 0, 1)")).toBe("motion");
  });
});

describe("css: modes and scopes", () => {
  test("Radix .dark, .dark-theme and .light, .light-theme", () => {
    const v = one("radix.css");
    expect(v.tokens["gray-1"]).toEqual({ light: "#fcfcfc", dark: "#111111" });
    expect(v.scoped).toBeUndefined();
  });
  test(":root:not([data-theme=light]) inside prefers-color-scheme: dark is dark", () => {
    const v = one("media-dark.css");
    expect(v.tokens.bg).toEqual({ light: "#ffffff", dark: "#000000" });
    expect(v.tokens.fg).toEqual({ light: "#111111", dark: "#eeeeee" });
  });
  test("prefers-contrast blocks are not a theme", () => {
    expect(one("media-dark.css").tokens["hc-only"]).toBeUndefined();
    for (const q of ["forced-colors: active", "print", "prefers-reduced-motion: reduce"])
      expect(css(`@media (${q}) { :root { --x: #f00 } }`).tokens.x).toBeUndefined();
  });
  test("[data-theme=x] and .theme-x become named modes", () => {
    const v = one("named-mode.css");
    expect(v.modes).toEqual(["light", "dark", "ocean", "sunset"]);
    expect(v.tokens.bg).toEqual({
      light: "#fff",
      ocean: "#001f3f",
      dark: "#000",
      sunset: "#fff3e0",
    });
    expect(val(v, "accent", "ocean")).toBe("#7fdbff");
  });
  test("[data-theme=light] is the light mode", () => {
    expect(css('[data-theme="light"] { --a: #fff }').tokens.a).toEqual({ light: "#fff" });
  });
  test("a component inside [data-theme=dark] stays scoped, not global dark", () => {
    const v = css(
      ':root{--bg:#fff}[data-theme="dark"]{--bg:#000}[data-theme="dark"] .card{--bg:#222}',
    );
    expect(v.tokens.bg).toEqual({ light: "#fff", dark: "#000" });
    expect(v.scoped?.map((s) => s.selector)).toEqual(['[data-theme="dark"] .card']);
  });
  test("Tailwind extend merges nested palettes", () => {
    const text =
      'module.exports = { theme: { colors: { brand: { 500: "#3b82f6" } }, extend: { colors: { brand: { 600: "#2563eb" } } } } };';
    const v = extract([{ path: "tailwind.config.js", text }]);
    expect(v.tokens["color-brand-500"]?.light).toBe("#3b82f6");
    expect(v.tokens["color-brand-600"]?.light).toBe("#2563eb");
  });
  test("color(), oklab, lab, lch and hwb values are colors", () => {
    for (const v of [
      "color(srgb 1 0 0)",
      "oklab(0.6 0.1 0.1)",
      "lab(50 20 30)",
      "lch(50 30 20)",
      "hwb(0 0% 0%)",
    ])
      expect(kind("brand", v)).toBe("color");
  });
  test("component-scoped custom properties go to scoped, not tokens", () => {
    const v = one("scoped.css");
    expect(Object.keys(v.tokens)).toEqual(["bg"]);
    expect(v.scoped).toEqual([
      { selector: ".card", count: 2 },
      { selector: ".btn", count: 1 },
    ]);
  });
  test("a dark-only file (color-scheme: dark, no .dark block) is the dark mode", () => {
    const v = one("dark-only.css");
    expect(v.modes).toEqual(["dark"]);
    expect(v.tokens.bg).toEqual({ dark: "#000" });
    const a = one("dark.css");
    expect(a.modes).toEqual(["dark"]);
    expect(val(a, "bg", "dark")).toBe("black");
  });
  test("color-scheme: dark inside a real .dark block doesn't flip the light tokens", () => {
    const v = css(":root{--a:#fff} .dark{color-scheme:dark;--a:#000}");
    expect(v.tokens.a).toEqual({ light: "#fff", dark: "#000" });
  });
  test("color-scheme: light dark is not dark-only", () => {
    expect(css(":root{color-scheme: light dark; --a:#fff}").modes).toEqual(["light"]);
  });
  test("selector lists: any theme part wins", () => {
    expect(css(":root, .light { --a: #fff }").tokens.a).toEqual({ light: "#fff" });
  });
  test("later files win on the same token and mode", () => {
    const v = extract([
      { path: "a.css", text: ":root{--a:#111}" },
      { path: "b.css", text: ":root{--a:#222}" },
    ]);
    expect(v.tokens.a?.light).toBe("#222");
    expect(v.sources).toEqual(["a.css", "b.css"]);
  });
});

describe("css: syntax edge cases", () => {
  const v = one("tricky.css");
  test("; and braces inside strings and url() don't split values; comments are ignored", () => {
    const s = one("tricky-strings.css");
    expect(val(s, "bg-image")).toStartWith("url(");
    expect(val(s, "bg-image")).toContain("<svg");
    expect(val(s, "font-quote")).toBe('"semi;colon", serif');
    expect(val(s, "after")).toBe("#abc");
    expect(v.tokens.fake).toBeUndefined();
  });
  test("readView refuses the url() and ;-in-string values but keeps the rest", () => {
    const r = readView(JSON.parse(JSON.stringify(one("tricky-strings.css"))));
    expect(Object.keys(r.tokens)).toEqual(["after"]);
  });
  test("!important is dropped, whitespace trimmed", () => {
    expect(val(v, "important")).toBe("#123456");
    expect(val(v, "spaced")).toBe("4px");
  });
  test("nested fallbacks, color-mix() and light-dark() are kept verbatim", () => {
    expect(val(v, "fb")).toBe("var(--a, var(--b, #fff))");
    expect(val(v, "mix")).toBe("color-mix(in oklab, var(--fb) 40%, transparent)");
    expect(val(v, "ld")).toBe("light-dark(#fff, #000)");
  });
  test("the last declaration without a semicolon or trailing brace is read", () => {
    expect(css(":root{--a:#fff;--b:#000").tokens.b?.light).toBe("#000");
  });
  test("a file with only comments gives an empty light view", () => {
    const e = css("/* nothing */");
    expect(e.tokens).toEqual({});
    expect(e.modes).toEqual(["light"]);
    expect(e.sources).toEqual([]);
  });
  test("stops at MAX_TOKENS and says so", () => {
    const big =
      ":root{" + Array.from({ length: MAX_TOKENS + 5 }, (_, i) => `--t${i}:#fff;`).join("") + "}";
    const e = css(big);
    expect(Object.keys(e.tokens)).toHaveLength(MAX_TOKENS);
    expect(e.notes?.[0]).toContain(String(MAX_TOKENS));
  });
  test("large.css reads without a scope explosion", () => {
    const e = one("large.css");
    expect(Object.keys(e.tokens).length).toBeGreaterThan(20);
    expect((e.scoped?.length ?? 0) <= 40).toBe(true);
  });
  test("a token called __proto__ cannot touch the prototype", () => {
    const e = css(":root{--__proto__:#fff;--a:#000}");
    expect(Object.keys(e.tokens)).toEqual(["a"]);
    expect(Object.getPrototypeOf(e.tokens)).toBe(Object.prototype);
  });
});

describe("existing audit fixtures", () => {
  test("shadcn.css", () => {
    const v = one("shadcn.css");
    expect(v.modes).toEqual(["light", "dark"]);
    expect(val(v, "primary-foreground")).toBe("oklch(0.985 0 0)");
    expect(val(v, "ring", "dark")).toBe("oklch(0.556 0 0)");
  });
  test("css-mix.css keeps references and has dark overrides", () => {
    const v = one("css-mix.css");
    expect(val(v, "bg")).toBe("var(--gray-50)");
    expect(val(v, "bg", "dark")).toBe("#0b0d12");
    expect(resolve(v, "link", "light")).toBe("#2563eb");
    expect(resolve(v, "link", "dark")).toBe("#3b82f6");
  });
  test("tokens.json (DTCG, aliases, $extensions.mode, composites)", () => {
    const v = one("tokens.json");
    expect(v.modes).toEqual(["light", "dark"]);
    expect(val(v, "color-bg")).toBe("var(--gray-0)");
    expect(resolve(v, "color-bg", "dark")).toBe("#09090b");
    expect(val(v, "font-size-body")).toBe("14px");
    expect(val(v, "typography-body-font-size")).toBe("var(--font-size-body)");
    expect(resolve(v, "typography-body-font-size", "light")).toBe("14px");
    expect(val(v, "typography-h1-font-weight")).toBe("700");
    expect(val(v, "space-4")).toBe("16px");
  });
  test("broken.tokens.json notes and doesn't throw", () => {
    const v = one("broken.tokens.json");
    expect(v.tokens).toEqual({});
    expect(v.notes?.[0]).toContain("not valid JSON");
    expect(v.sources).toEqual([]);
  });
  test("tailwind.config.js", () => {
    const v = one("tailwind.config.js");
    expect(val(v, "color-brand")).toBe("#0ea5e9");
    expect(val(v, "color-brand-dark")).toBe("#0369a1");
    expect(val(v, "text-xs")).toBe("11px");
    expect(val(v, "text-xs--line-height")).toBe("16px");
    expect(val(v, "text-2xl--line-height")).toBe("32px");
  });
  test("DESIGN.md front matter", () => {
    const v = one("DESIGN.md");
    expect(v.name).toBe("Harbor");
    expect(val(v, "color-on-surface-variant")).toBe("#6b7280");
    expect(val(v, "radius-md")).toBe("8px");
    expect(val(v, "spacing-xl")).toBe("40px");
    expect(val(v, "text-headline")).toBe("32px");
    expect(val(v, "text-headline--line-height")).toBe("1.2");
    expect(val(v, "text-label--font-weight")).toBe("500");
    expect(val(v, "font-body")).toBe("Inter");
    expect(v.notes).toBeUndefined();
  });
  test("a name argument beats DESIGN.md's", () => {
    expect(extract([{ path: "DESIGN.md", text: read("DESIGN.md") }], "Mine").name).toBe("Mine");
  });
  test("DESIGN.md without front matter adds nothing", () => {
    expect(extract([{ path: "DESIGN.md", text: "# Hi\n" }]).tokens).toEqual({});
  });
});

describe("json: Style Dictionary and DTCG", () => {
  test("legacy { value } leaves, with .value refs pointing at the token", () => {
    const v = one("style-dictionary.json");
    expect(val(v, "color-base-red")).toBe("#f00");
    expect(val(v, "color-base-blue")).toBe("#00f");
    expect(val(v, "color-brand")).toBe("var(--color-base-red)");
    expect(resolve(v, "color-brand", "light")).toBe("#f00");
  });
  const v = one("dtcg.json");
  test("$type is inherited from the group", () => {
    expect(val(v, "dur-fast")).toBe("150ms");
    expect(val(v, "ease-out")).toBe("cubic-bezier(0.2, 0, 0, 1)");
    expect(val(v, "font-sans")).toBe('Inter, "Helvetica Neue", sans-serif');
  });
  test("alias chains resolve", () => {
    expect(val(v, "color-alert")).toBe("var(--color-danger)");
    expect(resolve(v, "color-alert", "light")).toBe("#ef4444");
  });
  test("object colors", () => {
    expect(val(v, "color-oklch")).toBe("oklch(0.6 0.2 30 / 0.5)");
  });
  test("typography composite is split per property", () => {
    expect(val(v, "type-body-font-family")).toBe("Inter");
    expect(val(v, "type-body-font-size")).toBe("16px");
    expect(val(v, "type-body-line-height")).toBe("1.5");
    expect(val(v, "type-body-letter-spacing")).toBe("0.01em");
    expect(v.tokens["type-body"]).toBeUndefined();
  });
  test("shadow composites, single and layered", () => {
    expect(val(v, "shadow-card")).toBe("0px 1px 3px 0px #00000033");
    expect(val(v, "shadow-stack")).toBe("0px 1px 2px 0px #000, 0px 4px 8px 0px #0003");
    expect(kind("shadow-card", val(v, "shadow-card"))).toBe("shadow");
  });
  test("$extensions.mode adds modes; a dark-named file is the dark mode", () => {
    const x = extract([
      {
        path: "tokens.json",
        text: '{"c":{"$type":"color","bg":{"$value":"#fff","$extensions":{"mode":{"Dark":"#000"}}}}}',
      },
    ]);
    expect(x.tokens["c-bg"]).toEqual({ light: "#fff", dark: "#000" });
    const d = extract([{ path: "tokens.dark.json", text: '{"bg":{"$value":"#000"}}' }]);
    expect(d.modes).toEqual(["dark"]);
    expect(d.tokens.bg).toEqual({ dark: "#000" });
  });
  test("camelCase names are kebab-cased; unsupported value shapes are skipped", () => {
    const x = extract([
      {
        path: "t.json",
        text: '{"fontSize":{"bodyLg":{"$value":"18px"},"weird":{"$value":{"x":1}}}}',
      },
    ]);
    expect(Object.keys(x.tokens)).toEqual(["font-size-body-lg"]);
  });
  test("$-prefixed metadata keys are not walked", () => {
    const x = extract([
      { path: "t.json", text: '{"$description":{"$value":"no"},"a":{"$value":"#fff"}}' },
    ]);
    expect(Object.keys(x.tokens)).toEqual(["a"]);
  });
  test("a .json without tokens is ignored", () => {
    expect(kindOf("package.json", '{"name":"x"}')).toBeNull();
    expect(extract([{ path: "package.json", text: '{"name":"x"}' }]).sources).toEqual([]);
  });
});

describe("tailwind v3 config", () => {
  test("brand DEFAULT and steps, fontSize tuples with options, quoted families", () => {
    const v = one("tailwind3.config.ts", "tailwind.config.ts");
    expect(val(v, "color-brand")).toBe("#123456");
    expect(val(v, "color-brand-50")).toBe("#f0f0ff");
    expect(val(v, "text-sm")).toBe("0.875rem");
    expect(val(v, "text-sm--line-height")).toBe("1.25rem");
    expect(val(v, "text-sm--letter-spacing")).toBe("0.01em");
    expect(val(v, "text-base--line-height")).toBe("1.5rem");
    expect(val(v, "font-sans")).toBe('Inter, "Open Sans", sans-serif');
    expect(val(v, "radius-lg")).toBe("0.5rem");
  });
  test("require() and spreads make a note, not a crash", () => {
    const v = one("tailwind3-code.config.js", "tailwind.config.js");
    expect(v.tokens).toEqual({});
    expect(v.notes?.[0]).toContain("can't be read without running it");
  });
  test("no theme object makes a note", () => {
    expect(one("tailwind3-notheme.config.js", "tailwind.config.js").notes?.[0]).toContain(
      "no theme object",
    );
  });
  test("comments and urls with // don't break the parse", () => {
    const v = extract([
      {
        path: "tailwind.config.js",
        text: `module.exports = { theme: { // hi\n colors: { a: "#fff", /* b */ b: 'https://x.test/y' } } }`,
      },
    ]);
    expect(val(v, "color-a")).toBe("#fff");
    expect(val(v, "color-b")).toBe("https://x.test/y");
  });
});

describe("kindOf", () => {
  test("by name, then by sniffing pasted text", () => {
    expect(kindOf("a.scss", "")).toBe("css");
    expect(kindOf("tailwind.config.mjs", "")).toBe("tailwind");
    expect(kindOf("docs/DESIGN.md", "")).toBe("design.md");
    expect(kindOf("README.md", "")).toBeNull();
    expect(kindOf("", '{"a":{"$value":1}}')).toBe("json");
    expect(kindOf("", "---\nname: x\n---")).toBe("design.md");
    expect(kindOf("", "theme: { extend: {} }")).toBe("tailwind");
    expect(kindOf("", ":root { --a: 1 }")).toBe("css");
    expect(kindOf("", "hello")).toBeNull();
  });
});

describe("readView", () => {
  test("rejects bad shapes", () => {
    for (const bad of [null, 1, "x", [], {}, { v: 2, tokens: {} }, { v: 1 }, { v: 1, tokens: [] }])
      expect(() => readView(bad)).toThrow(/Spring View v1/);
  });
  const hostile = JSON.parse(read("view-hostile.json"));
  const v = readView(hostile);
  test("strips url(), @import, braces, angle brackets", () => {
    expect(v.tokens.img).toBeUndefined();
    expect(v.tokens.imp).toBeUndefined();
    expect(v.tokens.brace).toBeUndefined();
    expect(v.tokens.angle).toBeUndefined();
    expect(JSON.stringify(v)).not.toMatch(/url\(|@import|evil/);
  });
  test("ignores unknown modes and bad mode names", () => {
    expect(v.modes).toEqual(["light", "dark", "ocean"]);
    expect(v.tokens.ok).toEqual({ light: "#fff", dark: "#000", ocean: "#abc" });
  });
  test("a bare string is the default mode's value; bad keys and shapes drop", () => {
    expect(v.tokens.str).toEqual({ light: "#111" });
    expect(Object.keys(v.tokens).sort()).toEqual(["ok", "str"]);
  });
  test("defaults modes to light", () => {
    expect(readView({ v: 1, tokens: { a: "#fff" } }).modes).toEqual(["light"]);
    expect(readView({ v: 1, modes: [1, "bad one"], tokens: {} }).modes).toEqual(["light"]);
  });
  test("caps sizes", () => {
    const modes = Array.from({ length: 12 }, (_, i) => `m${i}`);
    expect(readView({ v: 1, modes, tokens: {} }).modes).toHaveLength(8);
    const tokens = Object.fromEntries(
      Array.from({ length: MAX_TOKENS + 50 }, (_, i) => [`t${i}`, "#fff"]),
    );
    expect(Object.keys(readView({ v: 1, tokens }).tokens)).toHaveLength(MAX_TOKENS);
    expect(readView({ v: 1, tokens: { a: "x".repeat(501) } }).tokens.a).toBeUndefined();
    expect(readView({ v: 1, tokens: { a: "x".repeat(500) } }).tokens.a).toBeDefined();
    expect(readView({ v: 1, name: "n".repeat(200), tokens: {} }).name).toHaveLength(80);
    const scoped = Array.from({ length: 60 }, (_, i) => ({
      selector: ".c" + "x".repeat(300),
      count: i,
    }));
    const s = readView({ v: 1, tokens: {}, scoped }).scoped!;
    expect(s).toHaveLength(40);
    expect(s[0]!.selector).toHaveLength(200);
    expect(
      readView({ v: 1, tokens: {}, notes: Array(80).fill("n".repeat(400)) }).notes,
    ).toHaveLength(50);
  });
  test("usage is cleaned: counts are non-negative integers, hits capped", () => {
    const u = readView({
      v: 1,
      tokens: {},
      usage: {
        files: 3.7,
        refs: { a: 4, "bad key!": 1, c: "x", d: -2 },
        raw: [
          { value: "#fff", at: "a.tsx:1" },
          { value: 1 },
          ...Array.from({ length: 150 }, () => ({ value: "v".repeat(500), at: "a" })),
        ],
        rawCount: -1,
        offSystem: "no",
        offSystemCount: 9,
      },
    }).usage!;
    expect(u.files).toBe(3);
    expect(u.refs).toEqual({ a: 4, d: 0 });
    expect(u.raw).toHaveLength(100);
    expect(u.raw[1]!.value).toHaveLength(120);
    expect(u.rawCount).toBe(0);
    expect(u.offSystem).toEqual([]);
    expect(u.offSystemCount).toBe(9);
  });
  test("does not carry $schema or unknown fields", () => {
    const r = readView({ v: 1, $schema: "x", evil: 1, tokens: {} }) as unknown as Record<
      string,
      unknown
    >;
    expect(r.$schema).toBeUndefined();
    expect(r.evil).toBeUndefined();
  });
  test("__proto__ keys and mode names are dropped", () => {
    const r = readView(
      JSON.parse(
        '{"v":1,"modes":["__proto__","light"],"tokens":{"__proto__":{"light":"#fff"},"b":{"light":"#000"}}}',
      ),
    );
    expect(r.modes).toEqual(["light"]);
    expect(Object.keys(r.tokens)).toEqual(["b"]);
    expect(Object.getPrototypeOf(r.tokens)).toBe(Object.prototype);
  });
});

describe("property: extract -> JSON -> readView is lossless", () => {
  const files = DIRS.flatMap((d) => readdirSync(d).map((f) => join(d, f))).filter(
    (f) => !/ground-truth|view-hostile|tricky-strings/.test(f),
  );
  test.each(files.map((f) => [f.split("/").slice(-2).join("/"), f] as const))("%s", (_, f) => {
    const text = readFileSync(f, "utf8");
    const view = extract([{ path: f, text }]);
    const back = readView(JSON.parse(JSON.stringify(view)));
    const { $schema: schema, ...rest } = view;
    expect(schema).toBeDefined();
    expect(back).toEqual(rest as View);
  });
  test("all fixtures together", () => {
    const view = extract(
      files
        .filter((f) => !/broken|tricky-strings/.test(f))
        .map((f) => ({ path: f, text: readFileSync(f, "utf8") })),
    );
    const { $schema: _schema, ...rest } = view;
    expect(readView(JSON.parse(JSON.stringify(view)))).toEqual(rest as View);
  });
});

const mk = (tokens: View["tokens"], modes = ["light", "dark"]): View => ({
  v: 1,
  modes,
  tokens,
  sources: [],
});

describe("resolve", () => {
  test("falls back to the default mode, then to var() fallbacks", () => {
    const v = mk({ a: { light: "#111" }, b: { light: "var(--a)", dark: "#222" } });
    expect(resolve(v, "a", "dark")).toBe("#111");
    expect(resolve(v, "b", "dark")).toBe("#222");
    expect(resolve(v, "b", "light")).toBe("#111");
    expect(resolve(v, "missing", "light")).toBeUndefined();
  });
  test("nested fallbacks", () => {
    const v = mk({
      x: { light: "var(--a, var(--b, #fff))" },
      y: { light: "var(--a, var(--b, #fff))" },
      b: { light: "#abc" },
    });
    expect(resolve(v, "x", "light")).toBe("#abc");
    const w = mk({ x: { light: "var(--a, var(--b, #fff))" } });
    expect(resolve(w, "x", "light")).toBe("#fff");
  });
  test("fallback with commas inside functions", () => {
    const v = mk({ x: { light: "var(--nope, rgb(0, 0, 0))" } });
    expect(resolve(v, "x", "light")).toBe("rgb(0, 0, 0)");
  });
  test("an unresolved var with no fallback stays as written", () => {
    expect(resolve(mk({ x: { light: "calc(var(--n) * 2)" } }), "x", "light")).toBe(
      "calc(var(--n) * 2)",
    );
  });
  test("several vars in one value", () => {
    const v = mk({ a: { light: "1px" }, b: { light: "2px" }, x: { light: "var(--a) var(--b)" } });
    expect(resolve(v, "x", "light")).toBe("1px 2px");
  });
  test("cycles and unterminated var() terminate", () => {
    const v = mk({ a: { light: "var(--b)" }, b: { light: "var(--a)" }, c: { light: "var(--zz" } });
    expect(typeof resolve(v, "a", "light")).toBe("string");
    expect(resolve(v, "c", "light")).toBe("var(--zz");
  });
  test("inherited property names are not tokens or modes", () => {
    const v = mk({ a: { light: "#fff" }, b: { light: "var(--constructor)" } }, [
      "light",
      "toString",
    ]);
    expect(resolve(v, "constructor", "light")).toBeUndefined();
    expect(resolve(v, "a", "toString")).toBe("#fff");
    expect(resolve(v, "b", "light")).toBe("var(--constructor)");
  });
});

describe("kind", () => {
  test.each([
    ["color-primary", "#fff", "color"],
    ["primary", "oklch(0.5 0.1 200)", "color"],
    ["background", "0 0% 100%", "color"],
    ["font-sans", 'Inter, "Helvetica Neue"', "font"],
    ["font-size-body", "14px", "size"],
    ["text-sm", "0.875rem", "size"],
    ["text-sm--line-height", "1.25rem", "leading"],
    ["leading-tight", "1.25", "leading"],
    ["tracking-tight", "-0.025em", "tracking"],
    ["font-weight-bold", "700", "weight"],
    ["text-body--font-weight", "400", "weight"],
    ["space-4", "1rem", "space"],
    ["spacing", "0.25rem", "space"],
    ["radius-lg", "0.5rem", "radius"],
    ["shadow-md", "0 1px 2px #0003", "shadow"],
    ["ease-out", "cubic-bezier(0,0,0.2,1)", "motion"],
    ["duration-fast", "150ms", "motion"],
    ["breakpoint-md", "48rem", "breakpoint"],
    ["z-modal", "50", "other"],
    ["opacity-disabled", "0.5", "other"],
  ] as const)("%s = %s is %s", (n, v, k) => expect(kind(n, v)).toBe(k));
  test("undefined value is other unless the name says", () => {
    expect(kind("mystery", undefined)).toBe("other");
    expect(kind("shadow-sm", undefined)).toBe("shadow");
  });
  test("a font name that's a color is a color unless named font", () => {
    expect(kind("brand", "red")).toBe("color");
  });
});

describe("colorOf / isColor", () => {
  test("reads hex, functions, names and bare shadcn HSL channels", () => {
    expect(colorOf("#fff")).toBe("#fff");
    expect(colorOf("  oklch(0.5 0.1 200)  ")).toBe("oklch(0.5 0.1 200)");
    expect(colorOf("red")).toBe("#ff0000");
    expect(colorOf("222.2 84% 4.9%")).toBe("hsl(222.2 84% 4.9%)");
    expect(colorOf("0 0% 100% / 50%")).toBe("hsl(0 0% 100% / 50%)");
  });
  test("rejects non-colors", () => {
    for (const x of ["", "  ", "16px", "var(--x)", "Inter", "#GGG", "1.5"])
      expect(isColor(x)).toBe(false);
  });
});

describe("groupOf", () => {
  test.each([
    ["color-primary-500", "primary", "500"],
    ["colors-brand-50", "brand", "50"],
    ["gray-1", "gray", "1"],
    ["blue-a3", "blue", "a3"],
    ["gray-950", "gray", "950"],
    ["color-brand", "brand", undefined],
    ["primary-foreground", "primary", undefined],
    ["background", "background", undefined],
  ])("%s", (n, group, step) => {
    const g = groupOf(n);
    expect(g.group).toBe(group);
    expect(g.step).toBe(step);
  });
});

describe("pairs", () => {
  test("shadcn style: x / x-foreground and foreground / background", () => {
    const p = pairs(["background", "foreground", "primary", "primary-foreground", "card"]);
    expect(p).toContainEqual({ fg: "foreground", bg: "background" });
    expect(p).toContainEqual({ fg: "primary-foreground", bg: "primary" });
    expect(p).toHaveLength(2);
  });
  test("material style: on-x / x, with and without a color- prefix", () => {
    expect(pairs(["on-primary", "primary"])).toEqual([{ fg: "on-primary", bg: "primary" }]);
    expect(pairs(["color-on-surface", "color-surface"])).toEqual([
      { fg: "color-on-surface", bg: "color-surface" },
    ]);
  });
  test("tailwind v4 namespaced foreground and background", () => {
    expect(pairs(["color-foreground", "color-background"])).toEqual([
      { fg: "color-foreground", bg: "color-background" },
    ]);
    expect(pairs(["color-text", "color-bg"])).toEqual([{ fg: "color-text", bg: "color-bg" }]);
  });
  test("-fg suffix and surface/canvas/page fallbacks", () => {
    expect(pairs(["action-fg", "action"])).toEqual([{ fg: "action-fg", bg: "action" }]);
    expect(pairs(["text", "surface"])).toEqual([{ fg: "text", bg: "surface" }]);
  });
  test("no partner, no pair; never pairs a token with itself", () => {
    expect(pairs(["primary-foreground", "secondary"])).toEqual([]);
    expect(pairs(["text"])).toEqual([]);
    expect(pairs([])).toEqual([]);
  });
});

const fan = (n: number) => Array.from({ length: 40 }, (_, i) => `var(--l${n + 1}-${i})`).join(" ");

describe("review fixes", () => {
  test("an apostrophe in an SCSS // comment doesn't eat tokens", () => {
    const v = extract([
      { path: "a.scss", text: ":root {\n  // it's here\n  --a: 1px;\n  --b: 2px;\n}" },
    ]);
    expect(val(v, "a")).toBe("1px");
    expect(val(v, "b")).toBe("2px");
  });
  test("an escaped quote stays inside a string value", () => {
    const v = css(':root { --q: "say \\"hi\\""; --after: 3px; }');
    expect(val(v, "q")).toBe('"say \\"hi\\""');
    expect(val(v, "after")).toBe("3px");
  });
  test("a media-query override is scoped and doesn't replace the theme value", () => {
    const v = css(":root{--x:1rem} @media (min-width:768px){:root{--x:2rem}}");
    expect(val(v, "x")).toBe("1rem");
    expect(v.scoped?.length).toBeGreaterThan(0);
  });
  test(".dark .card and .dark-sidebar are scoped, not the dark mode", () => {
    const v = css(":root{--a:1} .dark .card{--y:red} .dark-sidebar{--z:blue}");
    expect(v.modes).toEqual(["light"]);
    expect(v.tokens.y?.dark).toBeUndefined();
    expect(v.tokens.z?.dark).toBeUndefined();
    expect(v.scoped?.length).toBeGreaterThan(0);
  });
  test("tailwind theme.colors and extend.colors both survive", () => {
    const v = extract([
      {
        path: "tailwind.config.js",
        text: "module.exports = { theme: { colors: { brand: '#111' }, extend: { colors: { accent: '#222' } } } }",
      },
    ]);
    const names = Object.keys(v.tokens).join(" ");
    expect(names).toMatch(/brand/);
    expect(names).toMatch(/accent/);
  });
  test("DTCG hsl components become hsl()", () => {
    const v = extract([
      {
        path: "t.json",
        text: JSON.stringify({
          c: { $type: "color", $value: { colorSpace: "hsl", components: [200, 50, 50] } },
        }),
      },
    ]);
    expect(Object.values(v.tokens)[0]!.light).toBe("hsl(200 50% 50%)");
  });
  test("resolve() on a deep var() fan-out is bounded", () => {
    const tokens: View["tokens"] = {};
    for (let d = 0; d < 12; d++)
      for (let i = 0; i < 40; i++) tokens[`l${d}-${i}`] = { light: d === 11 ? "1px" : fan(d) };
    tokens.root = { light: fan(-1) };
    const view: View = { v: 1, modes: ["light"], tokens, sources: [] } as View;
    const out = resolve(view, "root", "light");
    expect((out ?? "").length).toBeLessThanOrEqual(120_000);
  });
});

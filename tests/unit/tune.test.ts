import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { isDefault, TUNE_DEFAULT, tuneOutput } from "@/lib/tune";

// Whitespace-free, so the formatter can wrap long lines.
const flat = (css: string) => css.replace(/\s+/g, "");
const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("tune output", () => {
  test("default writes nothing", () => {
    expect(tuneOutput(TUNE_DEFAULT)).toEqual({ attrs: {}, vars: {} });
    expect(isDefault(TUNE_DEFAULT)).toBe(true);
  });

  test("size and density switch the token multipliers on", () => {
    const out = tuneOutput({ ...TUNE_DEFAULT, size: "16", density: 1.5 });
    expect(out.attrs).toEqual({ "data-tune": "" });
    expect(out.vars).toEqual({ "--tune-f": String(16 / 14), "--tune-d": "1.5" });
  });

  test("type and hue are independent of the multipliers", () => {
    const out = tuneOutput({ ...TUNE_DEFAULT, type: "mono", hue: 250 });
    expect(out.attrs).toEqual({ "data-tune-type": "mono", "data-tune-hue": "" });
    expect(out.vars).toEqual({ "--tune-h": "250" });
  });
});

describe("tune.css mirrors the tokens", () => {
  const tune = flat(read("src/styles/tune.css"));
  const root = read("src/styles/tokens.css").split('[data-theme="dark"]')[0]!;
  const fluid = read("src/styles/fluid.css");

  test("every space step", () => {
    for (const [, name, value] of root.matchAll(/(--space-\d+): ([^;]+);/g))
      expect(tune).toContain(flat(`${name}: calc(${value} * var(--tune-d));`));
  });

  test("every type step", () => {
    for (const [, name, value] of fluid.matchAll(/(--step-[a-z0-9]+): ([^;]+);/g))
      expect(tune).toContain(flat(`${name}: calc(${value} * var(--tune-f)`));
  });

  test("every grey keeps its lightness", () => {
    for (const [, name, l] of root.matchAll(/(--color-gray-\d+): oklch\(([\d.]+)% 0 0\);/g))
      expect(tune).toMatch(new RegExp(`${name}:oklch\\(${l}%[\\d.]+var\\(--tune-h\\)\\);`));
  });
});

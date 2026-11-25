import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { audit } from "@/lib/spring/audit";
import {
  contrast as ratio,
  DEFAULT_CURVE,
  freshName,
  hueName,
  parseBezier,
  parseColor,
} from "@/lib/spring/color";
import { remapRamps } from "@/lib/spring/charts";
import { apcaContrast, channelsOf, formatColor, fromChannels } from "@/lib/spring/colormath";
import { exportAll, exportArea, toDesignMd } from "@/lib/spring/exports";
import { withFont } from "@/lib/spring/type";
import { SAMPLES } from "../fixtures/spring-samples";
import { decodeInput, encodeInput } from "@/lib/spring/state";
import {
  DEFAULT_INPUT,
  buildSystem,
  inputFromSeed,
  suggestData,
  type SystemInput,
} from "@/lib/spring/system";
import { crc32, zip } from "@/components/experiments/spring/zip";

const SEEDS = ["#3f8f3a", "#e11d48", "#f5c400", "#2563eb", "#111111", "#7c3aed", "#14b8a6"];
const inputs: SystemInput[] = [DEFAULT_INPUT, ...SEEDS.map((s) => inputFromSeed(s, "Seed"))];

describe("color", () => {
  test.each(inputs.map((i, n) => [n, i] as const))(
    "every required text pair passes WCAG AA (%i)",
    (_, input) => {
      const sys = buildSystem(input);
      const fails = Object.values(sys.checks)
        .flat()
        .filter((c) => !c.pass && !c.advisory);
      expect(fails.map((c) => `${c.fg} on ${c.bg} ${c.ratio}`)).toEqual([]);
    },
  );
});

describe("palette curve", () => {
  test("typed curve values read in either form and clamp to 0-1", () => {
    expect(parseBezier("cubic-bezier(0.4, 0.08, 0.9, 0.6)")).toEqual([0.4, 0.08, 0.9, 0.6]);
    expect(parseBezier(".2 .3 1.4 -0.5")).toEqual([0.2, 0.3, 1, 0]);
    expect(parseBezier("0.1, 0.2, 0.3")).toBeNull();
    expect(parseBezier("a, b, c, d")).toBeNull();
  });
  const seeds = ["#e11d48", "#f5c400", "#00a37a", "#7c3aed", "#0ea5e9", "#111111", "#ff66cc"];
  test("every scale runs one way, in both themes, for any brand", () => {
    for (const seed of seeds) {
      const sys = buildSystem(inputFromSeed(seed));
      for (const scale of Object.values(sys.scales).filter((x) => x !== undefined))
        for (const mode of ["light", "dark"] as const) {
          const l = scale[mode].map((s) => s.oklch.l);
          for (let i = 1; i < 12; i++)
            if (mode === "light") expect(l[i]!).toBeLessThan(l[i - 1]!);
            else expect(l[i]!).toBeGreaterThan(l[i - 1]!);
        }
    }
  });
  test("the brand color lands on a step exactly", () => {
    for (const seed of ["#e11d48", "#00a37a", "#7c3aed"]) {
      const sys = buildSystem(inputFromSeed(seed));
      const s = sys.scales.primary.light[sys.scales.primary.anchor.light - 1]!;
      expect(s.hex).toBe(seed);
    }
  });
  test("palette.js rebuilds the same scales without Spring", async () => {
    const input = {
      ...inputFromSeed("#7c3aed"),
      curve: { bezier: [0.3, 0.1, 0.8, 0.5], hueShift: 10, darkChroma: 0.7 },
    };
    const sys = buildSystem(input as SystemInput);
    const js = exportAll(sys).find((f) => f.path === "palette.js")!.content;
    const dir = mkdtempSync(join(tmpdir(), "palette-"));
    writeFileSync(join(dir, "palette.mjs"), js);
    const mod = await import(join(dir, "palette.mjs"));
    for (const name of ["primary", "warning"] as const)
      for (const mode of ["light", "dark"] as const) {
        const ours = buildSystem({ ...(input as SystemInput) }).scales[name][mode].map(
          (s) => s.hex,
        );
        const theirs = mod.scale(mod.seeds[name], mode) as string[];
        // Text steps may be nudged for contrast after generation; the curve itself must match.
        expect(theirs.slice(0, 10)).toEqual(ours.slice(0, 10));
      }
  });
  test("APCA matches the reference values", () => {
    expect(apcaContrast("#000000", "#ffffff")).toBeCloseTo(106.04, 1);
    expect(apcaContrast("#ffffff", "#000000")).toBeCloseTo(107.88, 1);
    expect(apcaContrast("#888888", "#ffffff")).toBeCloseTo(63.06, 1);
  });
  test("every contrast target holds for any brand", () => {
    for (const contrast of ["aa", "aaa", "apca"] as const)
      for (const seed of seeds) {
        const sys = buildSystem({ ...inputFromSeed(seed), contrast });
        for (const mode of ["light", "dark"] as const)
          expect(sys.checks[mode].filter((c) => !c.pass && !c.advisory)).toEqual([]);
      }
    const apca = buildSystem({ ...inputFromSeed("#7c3aed"), contrast: "apca" });
    expect(apca.checks.light.find((c) => c.fg === "text")!.min).toBe(75);
  });
  test("interaction states: pressed, selected and disabled roles for any brand", () => {
    for (const input of inputs) {
      const sys = buildSystem(input);
      for (const mode of ["light", "dark"] as const) {
        const by = Object.fromEntries(sys.roles[mode].map((r) => [r.name, r]));
        const step = (n: string) => Number(by[n]!.from.split(".")[1]);
        expect(step("primary-active")).toBeGreaterThanOrEqual(1);
        expect(step("primary-active")).toBeLessThanOrEqual(12);
        const dir = Math.sign(step("primary-hover") - step("primary"));
        expect(
          Math.sign(step("primary-active") - step("primary-hover")) * dir,
        ).toBeGreaterThanOrEqual(0);
        expect(by.selected!.from).toBe("primary.4");
        expect(by.disabled!.from).toBe("neutral.3");
        expect(by["disabled-text"]!.from).toBe("neutral.8");
        expect(
          sys.checks[mode].some((c) => c.fg === "primary-fg" && c.bg === "primary-active"),
        ).toBe(true);
        expect(sys.checks[mode].some((c) => c.fg === "disabled-text")).toBe(false);
      }
      const files = exportAll(sys);
      for (const n of ["primary-active", "selected", "disabled", "disabled-text"])
        for (const f of ["tokens.css", "tokens.json", "theme.css"])
          expect(files.find((x) => x.path.endsWith(f))?.content ?? "").toContain(n);
    }
  });

  test("a set status color wins, its hue kept inside the status range", () => {
    const base = inputFromSeed("#e11d48");
    const set = (status: SystemInput["status"]) => buildSystem({ ...base, status }).scales;
    expect(Math.round(set({ success: "#22aa44" }).success.seed.hue)).toBe(
      Math.round(parseColor("#22aa44")!.h),
    );
    expect(set({ info: "#cc44ff" }).info.seed.hue).toBe(265);
  });
  test("added strips get a scale, roles, checks and exports", () => {
    const sys = buildSystem({
      ...inputFromSeed("#7c3aed"),
      colors: [
        { name: "Secondary", hex: "#0ea5e9" },
        { name: "primary", hex: "#ff66cc" },
        { name: "Secondary", hex: "#00a37a" },
      ],
    });
    expect(sys.custom.map((c) => c.key)).toEqual(["secondary", "primary-custom", "secondary-2"]);
    expect(sys.scales.secondary!.light).toHaveLength(12);
    expect(sys.roles.light.some((r) => r.name === "secondary-fg")).toBe(true);
    for (const mode of ["light", "dark"] as const)
      expect(sys.checks[mode].filter((c) => !c.pass && !c.advisory)).toEqual([]);
    const css = exportAll(sys).find((f) => f.path === "tokens.css")!.content;
    expect(css).toContain("--secondary-2-12:");
    const back = decodeInput(encodeInput(sys.input))!;
    expect(back.colors).toEqual(sys.input.colors);
  });
  test("hue shift bends the brand, not grays or statuses", () => {
    const base = inputFromSeed("#7c3aed");
    const bent = buildSystem({ ...base, curve: { ...DEFAULT_CURVE, hueShift: 40 } }).scales;
    const flat = buildSystem(base).scales;
    expect(bent.warning.light.map((s) => s.hex)).toEqual(flat.warning.light.map((s) => s.hex));
    expect(bent.primary.light[1]!.hex).not.toBe(flat.primary.light[1]!.hex);
  });
  test("dark mode vividness scales only dark chroma", () => {
    const base = inputFromSeed("#7c3aed");
    const calm = buildSystem({ ...base, curve: { ...DEFAULT_CURVE, darkChroma: 0.5 } });
    const full = buildSystem(base);
    const k = full.scales.primary.anchor.dark - 1;
    expect(calm.scales.primary.light[k]!.hex).toBe(full.scales.primary.light[k]!.hex);
    expect(calm.scales.primary.dark[k]!.oklch.c).toBeLessThan(full.scales.primary.dark[k]!.oklch.c);
  });
  test("a share link keeps status hues, contrast target and dark vividness", () => {
    const input: SystemInput = {
      ...inputFromSeed("#00a37a"),
      curve: { ...DEFAULT_CURVE, darkChroma: 0.8 },
      status: { danger: "#dd2222", info: "#2266dd" },
      contrast: "apca",
    };
    const back = decodeInput(encodeInput(input))!;
    expect(back.curve?.darkChroma).toBe(0.8);
    expect(back.status).toEqual({ danger: "#dd2222", info: "#2266dd" });
    expect(back.contrast).toBe("apca");
    expect(decodeInput(encodeInput({ ...input, curve: undefined }))!.status).toEqual(input.status);
  });
  test("a share link keeps a custom curve", () => {
    const input = { ...DEFAULT_INPUT, curve: { bezier: [0.3, 0.1, 0.8, 0.5], hueShift: 12 } };
    const back = decodeInput(encodeInput(input as SystemInput))!;
    expect(back.curve).toEqual(input.curve as SystemInput["curve"]);
  });
});

describe("share link", () => {
  test("round-trips the input", () => {
    const input = { ...inputFromSeed("#e11d48", "Popfizz"), neutralHue: 75 };
    const back = decodeInput(encodeInput(input))!;
    expect(encodeInput(back)).toBe(encodeInput(input));
    expect(buildSystem(back).roles).toEqual(buildSystem(input).roles);
  });
  test("stays short", () => expect(encodeInput(DEFAULT_INPUT).length).toBeLessThan(400));
  test("rejects junk", () => {
    expect(decodeInput("nope")).toBeNull();
    expect(decodeInput(null)).toBeNull();
  });
  test("rejects other versions, so old saved state falls back", () => {
    const a = JSON.parse(atob(encodeInput(DEFAULT_INPUT).replace(/-/g, "+").replace(/_/g, "/")));
    expect(decodeInput(edited(a, 0, 2))).toBeNull();
  });
});

/** A share link someone edited by hand: index k of the compact array set to v. */
function edited(base: unknown[] | SystemInput, k: number, v: unknown): string {
  const a = Array.isArray(base)
    ? [...base]
    : JSON.parse(atob(encodeInput(base).replace(/-/g, "+").replace(/_/g, "/")));
  while (a.length <= k) a.push(null);
  a[k] = v;
  return btoa(JSON.stringify(a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const strip = (h: string) => ["c", h];

describe("hand-edited links", () => {
  test("one bad data strip drops the list instead of shifting the ramps", () => {
    const base = edited(DEFAULT_INPUT, 14, [strip("#ff0000"), "junk", strip("#0000ff")]);
    const a = JSON.parse(atob(base.replace(/-/g, "+").replace(/_/g, "/")));
    const back = decodeInput(edited(a, 15, [2, [0, 2]]))!;
    expect(back.data).toBeUndefined();
    expect(back.ramps).toBeUndefined();
  });
  test("ramps must point at a strip that exists", () => {
    const a = JSON.parse(
      atob(
        edited(DEFAULT_INPUT, 14, [strip("#ff0000"), strip("#00ff00")])
          .replace(/-/g, "+")
          .replace(/_/g, "/"),
      ),
    );
    expect(decodeInput(edited(a, 15, [1, [0, 1]]))!.ramps).toEqual({ seq: 1, div: [0, 1] });
    expect(decodeInput(edited(a, 15, [5, [0, 9]]))!.ramps).toEqual({
      seq: undefined,
      div: undefined,
    });
    expect(decodeInput(edited(a, 15, [0.5, null]))!.ramps!.seq).toBeUndefined();
  });
  test("a ramp past the last strip falls back to the first", () => {
    const sys = buildSystem(decodeInput(edited(DEFAULT_INPUT, 15, [9, [8, 9]]))!);
    expect(sys.charts.seq).toBe(sys.charts.keys[0]);
    expect(sys.charts.div).toEqual(sys.charts.keys.slice(0, 2) as [string, string]);
  });
  test("ramps on the suggested strips survive without a[14]", () => {
    expect(decodeInput(edited(DEFAULT_INPUT, 15, [3, null]))!.ramps!.seq).toBe(3);
  });
  test("without a[14], a ramp past the six suggested strips is dropped", () => {
    expect(decodeInput(edited(DEFAULT_INPUT, 15, [6, [5, 7]]))!.ramps).toEqual({
      seq: undefined,
      div: undefined,
    });
  });
  test("unknown component or icon library falls back and exports still build", () => {
    const st = ["app", "own", "tailwind", "nope", "__proto__"];
    const back = decodeInput(edited(DEFAULT_INPUT, 8, st))!;
    expect(back.stack.components).toBeUndefined();
    expect(back.stack.icons).toBeUndefined();
    expect(() => toDesignMd(buildSystem(back))).not.toThrow();
    expect(() => exportAll(buildSystem(back))).not.toThrow();
  });
});

describe("audit", () => {
  test.each(inputs.slice(0, 5).map((i, n) => [n, i] as const))(
    "scores our own exports 100 (%i)",
    (_, input) => {
      const sys = buildSystem(input);
      for (const file of exportAll(sys).filter((f) =>
        /DESIGN\.md|tokens\.(css|json)$/.test(f.path),
      ))
        expect(audit(file.content).score).toBe(100);
    },
  );
  test("catches the bad samples", () => {
    for (const s of SAMPLES) expect(audit(s.text).score).toBeLessThan(60);
  });
});

describe("DESIGN.md", () => {
  test("passes the Google design.md linter with no warnings", () => {
    const dir = mkdtempSync(join(tmpdir(), "spring-"));
    for (const [n, input] of [DEFAULT_INPUT, inputFromSeed("#e11d48", "Popfizz")].entries()) {
      const file = join(dir, `${n}.md`);
      writeFileSync(file, toDesignMd(buildSystem(input)));
      const out = execFileSync("node_modules/.bin/design.md", ["lint", file], { encoding: "utf8" });
      const { summary } = JSON.parse(out) as { summary: { errors: number; warnings: number } };
      expect(summary).toMatchObject({ errors: 0, warnings: 0 });
    }
  });
});

describe("zip", () => {
  test("crc32 matches the reference value", () =>
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926));
  test("writes one entry per file", async () => {
    const bytes = new Uint8Array(
      await zip([
        { path: "a.txt", content: "hi" },
        { path: "b/c.md", content: "yo" },
      ]).arrayBuffer(),
    );
    const end = new DataView(bytes.buffer, bytes.length - 22);
    expect(end.getUint32(0, true)).toBe(0x06054b50);
    expect(end.getUint16(10, true)).toBe(2);
  });
});

describe("audit parsing", () => {
  test("follows chained DTCG aliases", () => {
    const tokens = {
      color: {
        $type: "color",
        role: { text: { $value: "{color.alias.ink}" } },
        alias: { ink: { $value: "{color.base.gray}" } },
        base: { gray: { $value: "#777777" } },
      },
    };
    const text = audit(JSON.stringify(tokens)).parsed.colors.find(
      (c) => c.name === "color-role-text",
    );
    expect(text?.hex).toBe("#777777");
  });
});

describe("shadcn export", () => {
  test("bg-accent is shadcn's hover fill; bg-primary stays the brand", () => {
    const sys = buildSystem({
      ...DEFAULT_INPUT,
      stack: { ...DEFAULT_INPUT.stack, components: "shadcn" },
    });
    const css = exportAll(sys).find((f) => f.path.endsWith("theme.css"))!.content;
    expect(css).toContain("--color-accent: var(--accent);");
    expect(css).toContain("--color-primary: var(--color-primary);");
    expect(css).not.toContain("--color-primary: var(--primary);");
  });
});

describe("motion", () => {
  test("the spring ships with its settle time, which grows as energy drops", () => {
    const calm = buildSystem({ ...DEFAULT_INPUT, motion: 0 }).motion.duration.spring;
    const lively = buildSystem({ ...DEFAULT_INPUT, motion: 1 });
    expect(calm).toBeGreaterThan(lively.motion.duration.spring);
    const css = exportAll(lively).find((f) => f.path.endsWith("tokens.css"))!.content;
    expect(css).toContain(`--duration-spring: ${lively.motion.duration.spring}ms;`);
    expect(css).toContain("--duration-spring: 0ms;");
  });
});

test("audit checks DTCG dark values, not only light ones", () => {
  const tokens = {
    color: {
      $type: "color",
      bg: { $value: "#ffffff", $extensions: { mode: { dark: "#111111" } } },
      text: { $value: "#111111", $extensions: { mode: { dark: "#333333" } } },
    },
  };
  const f = audit(JSON.stringify(tokens)).findings.find((x) => x.id === "contrast")!;
  expect(f.status).toBe("fail");
  expect(f.detail).toContain("(dark)");
});

describe("any Google font", () => {
  const meta = { tag: "serif" as const, weights: [400, 700], variable: null };
  const type = withFont(DEFAULT_INPUT.type, "heading", "Playfair Display", meta);
  const input: SystemInput = { ...DEFAULT_INPUT, type };

  test("round-trips through the share link", () => {
    const back = decodeInput(encodeInput(input))!;
    expect(back.type.heading).toBe("Playfair Display");
    expect(back.type.extra).toEqual({ "Playfair Display": meta });
  });

  test("rejects unsafe names and unknown fonts from a link", () => {
    const bad = { ...input, type: { ...type, heading: 'X"}', extra: { 'X"}': meta } } };
    expect(decodeInput(encodeInput(bad))!.type.heading).toBe(DEFAULT_INPUT.type.heading);
    const orphan = { ...input, type: { ...type, extra: undefined } };
    expect(decodeInput(encodeInput(orphan))!.type.heading).toBe(DEFAULT_INPUT.type.heading);
  });

  test("builds type, loads the font and skips guessed fallbacks", () => {
    const sys = buildSystem(input);
    const h1 = sys.type.tokens.find((t) => t.role === "h1")!;
    expect(h1.family).toBe("Playfair Display");
    expect([400, 700]).toContain(h1.weight);
    expect(sys.type.fallbacks.heading.css).toBe("");
    const css = exportAll(sys).find((f) => f.path === "tokens.css")!.content;
    expect(css).toContain("family=Playfair+Display:wght@400;700");
    expect(css).toContain('--font-heading: "Playfair Display", ui-serif');
  });

  test("drops metadata once no role uses the font", () => {
    expect(withFont(type, "heading", "Inter").extra).toBeUndefined();
  });
});

describe("per-tool exports", () => {
  const sys = buildSystem(DEFAULT_INPUT);
  test.each(["color", "type", "space", "motion"] as const)(
    "%s exports only its own tokens",
    (a) => {
      const { css, json } = exportArea(sys, a);
      const vars = [...css.content.matchAll(/^\s*--([a-z]+)-/gm)].map((m) => m[1]);
      const own: Record<typeof a, string[]> = {
        color: [
          "primary",
          "neutral",
          "danger",
          "warning",
          "success",
          "info",
          "color",
          "chart",
          ...sys.data.map((d) => d.key),
        ],
        type: ["font", "text"],
        space: [
          "space",
          "control",
          "pad",
          "radius",
          "border",
          "shadow",
          "focus",
          "icon",
          "z",
          "opacity",
          "breakpoint",
        ],
        motion: ["duration", "ease"],
      };
      expect(vars.length).toBeGreaterThan(0);
      expect(vars.filter((v) => !own[a].includes(v!))).toEqual([]);
      expect(() => JSON.parse(json.content)).not.toThrow();
    },
  );
});

// Samples and answer key from the 2026-11-24 audit eval; ratios checked against colorjs.
const readSample = (f: string) =>
  audit(readFileSync(join(import.meta.dir, "../fixtures/audit", f), "utf8"));

describe("audit reads real systems", () => {
  const read = readSample;
  const said = (f: string) =>
    read(f)
      .findings.map((x) => `${x.title}: ${x.detail}`)
      .join("\n");

  test("CSS dark blocks are checked, and alpha is composited", () => {
    const s = said("css-mix.css");
    expect(s).toContain("text-muted on bg (dark) 3.14:1");
    expect(s).toContain("text-placeholder on surface 2.85:1");
    expect(s).toContain("text-placeholder on surface (dark) 1.09:1");
    expect(s).toContain("primary-fg on primary (dark) 3.68:1");
    expect(s).not.toContain("No dark theme");
    expect(s).not.toMatch(/text-muted on (bg|surface) \d/);
  });

  test("ratios come from the value as written, not a rounded hex", () => {
    const s = said("shadcn.css");
    expect(s).toContain("destructive-foreground on destructive 4.49:1");
    expect(s).toContain("ring on background 2.59:1");
    expect(s).toContain("sidebar-ring on sidebar (dark) 2.30:1");
    expect(s).not.toContain("muted-foreground on background");
  });

  test("component text is checked on its own background", () => {
    const s = said("large.css");
    for (const pair of [
      "tooltip-muted on tooltip-bg 3.40:1",
      "table-header-muted on table-header-bg 3.40:1",
      "badge-warning-fg on badge-warning-bg 3.35:1",
      "toast-muted on toast-bg (dark) 2.14:1",
    ])
      expect(s).toContain(pair);
    expect(s).not.toContain("tooltip-muted on tooltip-bg (dark)");
  });

  test("a dark-only system isn't told it lacks a dark theme", () => {
    const s = said("dark.css");
    expect(s).not.toContain("No dark theme");
    expect(s).toContain("text-muted on bg 3.83:1");
    expect(s).toContain("link on bg 4.33:1");
  });

  test("Tailwind configs are read", () => {
    const r = read("tailwind.config.js");
    expect(r.parsed.format).toBe("tailwind");
    const s = said("tailwind.config.js");
    expect(s).toContain("brand-fg on brand 2.77:1");
    expect(s).toContain("ink-muted on panel 4.34:1");
    expect(s).toContain("xs 11px");
    expect(s).toContain("No dark theme");
    expect(s).not.toContain("ink-muted on canvas");
  });

  test("DTCG dark aliases, type aliases and weights are read", () => {
    const s = said("tokens.json");
    expect(s).toContain("color-text-subtle on color-bg (dark) 2.57:1");
    expect(s).toContain("typography-body 14px at 1.2");
    expect(s).toContain("typography-caption 12px at 300");
    expect(s).not.toContain("off the grid");
    expect(s).not.toContain("No dark theme");
    expect(s).not.toContain("text-disabled");
  });

  test("a clean system scores 100, and broken JSON says so", () => {
    expect(read("clean.css").score).toBe(100);
    expect(() => read("broken.tokens.json")).toThrow(/Not valid JSON/);
  });
});

describe("data colors", () => {
  test("ramps stay on their strips when strips move or go", () => {
    const ramps = { seq: 2, div: [0, 1] as [number, number] };
    // Swap 1 and 2: amounts follows green to 1, the arms follow too.
    expect(remapRamps(ramps, (i) => (i === 1 ? 2 : i === 2 ? 1 : i))).toEqual({
      seq: 1,
      div: [0, 2],
    });
    // Remove 0: amounts shifts down, the arm on 0 is gone so the default returns.
    expect(remapRamps(ramps, (i) => (i === 0 ? undefined : i - 1))).toEqual({ seq: 1 });
  });

  test.each(inputs.map((i, n) => [n, i] as const))(
    "every suggested mark reaches 3:1 on the page, in both themes (%i)",
    (_, input) => {
      const sys = buildSystem(input);
      expect(sys.data).toHaveLength(6);
      for (const mode of ["light", "dark"] as const) {
        const page = sys.scales.neutral[mode][0]!.hex;
        for (const hex of sys.charts.marks[mode])
          expect(ratio(hex, page)).toBeGreaterThanOrEqual(3);
      }
    },
  );

  test.each(inputs.map((i, n) => [n, i] as const))(
    "six suggested colors stay apart for every color-blindness type (%i)",
    (_, input) => {
      const c = buildSystem(input).charts;
      for (const mode of ["light", "dark"] as const)
        for (const v of ["protan", "deutan", "tritan"] as const)
          expect(c.closest[mode][v].d).toBeGreaterThanOrEqual(0.05);
    },
  );

  test("data colors are strips: a mark is a step of its own 12-step scale", () => {
    const sys = buildSystem(DEFAULT_INPUT);
    sys.data.forEach((d, i) => {
      const step = sys.charts.markStep.light[i]!;
      expect(sys.scales[d.key]!.light[step - 1]!.hex).toBe(sys.charts.marks.light[i]!);
      expect(step).toBeGreaterThanOrEqual(sys.scales[d.key]!.anchor.light);
    });
  });

  test("suggested names are plain, lowercase and unique", () => {
    for (const input of inputs) {
      const names = buildSystem(input).data.map((d) => d.name);
      expect(new Set(names).size).toBe(names.length);
      for (const n of names) expect(n).toBe(n.toLowerCase());
    }
  });

  test("ramps come from the chosen strips; diverging has a neutral middle", () => {
    const sys = buildSystem({ ...DEFAULT_INPUT, ramps: { seq: 2, div: [1, 3] } });
    const c = sys.charts;
    expect(c.seq).toBe(sys.data[2]!.key);
    expect(c.div).toEqual([sys.data[1]!.key, sys.data[3]!.key]);
    for (const mode of ["light", "dark"] as const) {
      const ls = c.sequential[mode].map((h) => parseColor(h)!.l);
      const dir = mode === "light" ? -1 : 1;
      for (let i = 1; i < ls.length; i++) expect((ls[i]! - ls[i - 1]!) * dir).toBeGreaterThan(0);
      expect(c.diverging[mode]).toHaveLength(9);
      expect(c.diverging[mode][4]).toBe(sys.scales.neutral[mode][1]!.hex);
    }
  });

  test("an empty list means no data colors, and the export says so", () => {
    const sys = buildSystem({ ...DEFAULT_INPUT, data: [] });
    expect(sys.charts.marks.light).toEqual([]);
    expect(toDesignMd(sys)).toContain("No data colors are set");
  });

  test("UI and data strips share token names without clashing", () => {
    const sys = buildSystem({
      ...DEFAULT_INPUT,
      colors: [{ name: "blue", hex: "#2563eb" }],
      data: [{ name: "blue", hex: "#1d4ed8" }],
    });
    expect(sys.custom[0]!.key).toBe("blue");
    expect(sys.data[0]!.key).toBe("blue-2");
  });

  test("chart tokens export one per data color, full scales only for ramp strips", () => {
    const input: SystemInput = {
      ...DEFAULT_INPUT,
      data: [
        { name: "teal", hex: "#0d9488" },
        { name: "orange", hex: "#ea580c" },
        { name: "violet", hex: "#7c3aed" },
      ],
      ramps: { seq: 0, div: [0, 1] },
    };
    const sys = buildSystem(input);
    const files = Object.fromEntries(exportAll(sys).map((f) => [f.path, f.content]));
    expect(files["tokens.css"]).toContain(`--chart-1: ${sys.charts.marks.light[0]};`);
    expect(files["tokens.css"]).toContain("--chart-3:");
    expect(files["tokens.css"]).not.toContain("--chart-4:");
    expect(files["tokens.css"]).toContain("--chart-div-9:");
    expect(files["tokens.css"]).toContain("--teal-12:");
    expect(files["tokens.css"]).toContain("--orange-12:");
    expect(files["tokens.css"]).not.toContain("--violet-1:");
    expect(files["tokens.css"]).toContain("--chart-gap: var(--color-bg);");
    expect(files["theme.css"]).toContain("--color-chart-seq-1: var(--chart-seq-1);");
    expect(JSON.parse(files["tokens.json"]!).color.chart["3"]).toBeDefined();
    expect(files["DESIGN.md"]).toContain("`--chart-1` (teal)");
    expect(decodeInput(encodeInput(input))).toMatchObject({ data: input.data, ramps: input.ramps });
  });

  test("suggestions don't move when nothing they depend on changes", () => {
    const a = buildSystem(DEFAULT_INPUT).data.map((d) => d.hex);
    const b = buildSystem({ ...DEFAULT_INPUT, name: "Other", density: 1 }).data.map((d) => d.hex);
    expect(b).toEqual(a);
  });
});

describe("primary rename and formats", () => {
  test("Spring's own tokens say primary; shadcn keeps its own accent", () => {
    const sys = buildSystem({
      ...DEFAULT_INPUT,
      stack: { ...DEFAULT_INPUT.stack, components: "shadcn" },
    });
    const files = Object.fromEntries(exportAll(sys).map((f) => [f.path, f.content]));
    expect(files["tokens.css"]).toContain("--primary-9:");
    expect(files["tokens.css"]).not.toContain("accent");
    const theme = files["theme.css"]!;
    expect(theme.match(/^ {2}--primary:/gm)).toHaveLength(1);
    expect(theme).toContain("--accent: var(--color-fill-hover);");
  });

  test("old share links still load, including one with retired chart settings", () => {
    const old = encodeInput(DEFAULT_INPUT);
    expect(decodeInput(old)!.primary).toMatchObject(DEFAULT_INPUT.primary);
    const arr = JSON.parse(Buffer.from(old, "base64url").toString());
    while (arr.length < 13) arr.push(null);
    arr.push([6, 40]);
    const withCharts = Buffer.from(JSON.stringify(arr)).toString("base64url");
    expect(decodeInput(withCharts)).toMatchObject({ primary: DEFAULT_INPUT.primary });
    expect(decodeInput(withCharts)!.data).toBeUndefined();
  });

  test("rgb format and channels round-trip", () => {
    expect(formatColor("#2563eb", "rgb")).toBe("rgb(37 99 235)");
    for (const f of ["oklch", "hsl", "rgb", "hex"] as const) {
      const back = fromChannels(f, channelsOf("#2563eb", f));
      const d = parseColor(back)!;
      const o = parseColor("#2563eb")!;
      expect(Math.abs(d.l - o.l)).toBeLessThan(0.01);
      expect(Math.abs(d.h - o.h)).toBeLessThan(2);
    }
  });

  test("plain hue names, kept unique", () => {
    expect(hueName({ c: 0.15, h: 150 })).toBe("green");
    expect(hueName({ c: 0.01, h: 150 })).toBe("gray");
    const c = parseColor("#93c5fd")!;
    expect(freshName(c, ["blue"])).toBe("light blue");
    expect(freshName(c, ["blue", "light blue"])).toBe("blue 2");
  });
});

const dupes = (ring: string) =>
  audit(`:root {
  --color-bg: #ffffff;
  --color-text: #111111;
  --primary: #1d4ed8;
  --ring: ${ring};
}`).findings.some((f) => f.id === "near-dupes");

describe("audit: edges and rings are not text", () => {
  test("a border named like a link and an illustration ink are not text pairs", () => {
    const css = `:root {
  --color-bg: #ffffff;
  --color-text: #111111;
  --border-link: oklch(20% 0 0 / 0.35);
  --illustration-mascot-ink: #fafafa;
}`;
    const contrast = audit(css).findings.find((f) => f.id === "contrast")!;
    expect(contrast.status).toBe("pass");
  });

  test("focus-ring next to a focus color is checked on the page, not on itself", () => {
    const css = `:root {
  --color-bg: #ffffff;
  --color-text: #111111;
  --color-focus: #111111;
  --focus-ring: #111111;
}`;
    expect(audit(css).findings.some((f) => f.id === "ring")).toBe(false);
  });

  test("a translucent copy of a color is derived, not a near-duplicate", () => {
    expect(dupes("#1d4ed880")).toBe(false);
    expect(dupes("oklch(48.8% 0.241 264 / 50%)")).toBe(false);
    expect(dupes("#1d4ed9")).toBe(true);
  });
});

describe("suggest data colors", () => {
  test("adds one color, keeps the rest, and keeps chart checks passing", () => {
    const base = suggestData(DEFAULT_INPUT);
    const next = suggestData(DEFAULT_INPUT, base);
    expect(next).toHaveLength(base.length + 1);
    expect(next.slice(0, base.length)).toEqual(base);
    expect(new Set(next.map((c) => c.name)).size).toBe(next.length);
    const sys = buildSystem({ ...DEFAULT_INPUT, data: next });
    for (const mode of ["light", "dark"] as const)
      expect(sys.charts.checks[mode].filter((c) => c.status === "fail")).toEqual([]);
  });
});

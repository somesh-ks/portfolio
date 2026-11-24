import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { audit } from "@/lib/spring/audit";
import { DEFAULT_CURVE, parseBezier, parseColor } from "@/lib/spring/color";
import { apcaContrast } from "@/lib/spring/colormath";
import { MOODS, pairings } from "@/lib/spring/pairing";
import { exportAll, exportArea, toDesignMd } from "@/lib/spring/exports";
import { withFont } from "@/lib/spring/type";
import { SAMPLES } from "../fixtures/spring-samples";
import { decodeInput, encodeInput } from "@/lib/spring/state";
import { DEFAULT_INPUT, buildSystem, inputFromSeed, type SystemInput } from "@/lib/spring/system";
import { FONTS } from "@/lib/spring/fonts.data";
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
      const s = sys.scales.accent.light[sys.scales.accent.anchor.light - 1]!;
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
    for (const name of ["accent", "warning"] as const)
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
        { name: "accent", hex: "#ff66cc" },
        { name: "Secondary", hex: "#00a37a" },
      ],
    });
    expect(sys.custom.map((c) => c.key)).toEqual(["secondary", "accent-custom", "secondary-2"]);
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
    expect(bent.accent.light[1]!.hex).not.toBe(flat.accent.light[1]!.hex);
  });
  test("dark mode vividness scales only dark chroma", () => {
    const base = inputFromSeed("#7c3aed");
    const calm = buildSystem({ ...base, curve: { ...DEFAULT_CURVE, darkChroma: 0.5 } });
    const full = buildSystem(base);
    const k = full.scales.accent.anchor.dark - 1;
    expect(calm.scales.accent.light[k]!.hex).toBe(full.scales.accent.light[k]!.hex);
    expect(calm.scales.accent.dark[k]!.oklch.c).toBeLessThan(full.scales.accent.dark[k]!.oklch.c);
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
});

describe("pairing", () => {
  test.each(Object.keys(MOODS))("suggests varied pairings for %s", (m) => {
    const ps = pairings(MOODS[m]!.feel, 4);
    expect(ps).toHaveLength(4);
    expect(new Set(ps.map((p) => p.heading)).size).toBeGreaterThanOrEqual(2);
  });
  test("interfaces get a sans body", () => {
    for (const m of Object.values(MOODS))
      for (const p of pairings(m.feel, 4, undefined, "app"))
        expect(["serif"]).not.toContain(FONTS[p.body].tag);
  });
  test("is deterministic", () =>
    expect(pairings(MOODS.warm!.feel)).toEqual(pairings(MOODS.warm!.feel)));
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
  test("bg-accent is the hover fill that pairs with accent-foreground", () => {
    const sys = buildSystem({
      ...DEFAULT_INPUT,
      stack: { ...DEFAULT_INPUT.stack, components: "shadcn" },
    });
    const css = exportAll(sys).find((f) => f.path.endsWith("theme.css"))!.content;
    expect(css).toContain("--color-accent: var(--accent);");
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
        color: ["accent", "neutral", "danger", "warning", "success", "info", "color"],
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

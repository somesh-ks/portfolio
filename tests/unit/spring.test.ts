import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { audit } from "@/lib/spring/audit";
import { MOODS, pairings } from "@/lib/spring/pairing";
import { exportAll, exportArea, toDesignMd } from "@/lib/spring/exports";
import { withFont } from "@/lib/spring/type";
import { SAMPLES } from "@/lib/spring/samples";
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
  const seeds = ["#e11d48", "#f5c400", "#00a37a", "#7c3aed", "#0ea5e9", "#111111", "#ff66cc"];
  test("every scale runs one way, in both themes, for any brand", () => {
    for (const seed of seeds) {
      const sys = buildSystem(inputFromSeed(seed));
      for (const scale of Object.values(sys.scales))
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
      curve: { bezier: [0.3, 0.1, 0.8, 0.5], hueShift: 10 },
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
        space: ["space", "control", "pad", "radius", "border", "shadow"],
        motion: ["duration", "ease"],
      };
      expect(vars.length).toBeGreaterThan(0);
      expect(vars.filter((v) => !own[a].includes(v!))).toEqual([]);
      expect(() => JSON.parse(json.content)).not.toThrow();
    },
  );
});

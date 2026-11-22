import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { audit } from "@/lib/spring/audit";
import { MOODS, pairings } from "@/lib/spring/pairing";
import { exportAll, toDesignMd } from "@/lib/spring/exports";
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

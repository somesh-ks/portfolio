/**
 * Chart colors are ordinary strips: each data color is a 12-step scale on the
 * same curve as the UI, and its mark is the step a chart draws. This file only
 * adds what data needs on top: the color-blindness math, a Suggest that picks
 * seeds whose marks stay apart for everyone, the two ramps, and the checks.
 */
import { clampChroma, linearToOklch, oklchToHex, oklchToLinear, wcagContrast } from "./colormath";
import { buildScale, type BuiltScale, type Curve, type Mode, type Step } from "./color";

export const CHART_MAX = 10;
export type Vision = "normal" | "protan" | "deutan" | "tritan";
export const VISIONS: Vision[] = ["normal", "protan", "deutan", "tritan"];
export const VISION_LABEL: Record<Vision, string> = {
  normal: "Normal vision",
  protan: "Protanopia",
  deutan: "Deuteranopia",
  tritan: "Tritanopia",
};

// Machado, Oliveira & Fernandes 2009, severity 1.0, on linear sRGB.
const SIM: Record<Exclude<Vision, "normal">, number[]> = {
  protan: [
    0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998,
  ],
  deutan: [
    0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881,
  ],
  tritan: [
    1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039,
  ],
};

/** The same matrices for an SVG feColorMatrix (linearRGB), so the page can show what the math checks. */
export const CVD_FILTER = Object.fromEntries(
  Object.entries(SIM).map(([k, m]) => [
    k,
    [0, 1, 2].map((r) => `${m.slice(r * 3, r * 3 + 3).join(" ")} 0 0`).join(" ") + " 0 0 0 1 0",
  ]),
) as Record<Exclude<Vision, "normal">, string>;

type Lab = [number, number, number];
const lab = (l: number, c: number, h: number): Lab => {
  const r = (h * Math.PI) / 180;
  return [l, c * Math.cos(r), c * Math.sin(r)];
};
const dist = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** How a color looks with each vision type, in OKLab. */
function seen(l: number, c: number, h: number): Record<Vision, Lab> {
  const rgb = oklchToLinear({ l, c, h }).map((v) => Math.min(1, Math.max(0, v)));
  const out = { normal: lab(l, c, h) } as Record<Vision, Lab>;
  for (const [k, m] of Object.entries(SIM) as [Exclude<Vision, "normal">, number[]][]) {
    const s = [0, 1, 2].map((i) =>
      Math.min(
        1,
        Math.max(0, m[i * 3]! * rgb[0]! + m[i * 3 + 1]! * rgb[1]! + m[i * 3 + 2]! * rgb[2]!),
      ),
    ) as [number, number, number];
    const o = linearToOklch(s);
    out[k] = lab(o.l, o.c, o.h);
  }
  return out;
}

/** A data color the user keeps: a name and a seed, built like any strip. */
export interface DataColor {
  name: string;
  hex: string;
}
/** Which data strips the ramps use, by position. */
export interface Ramps {
  seq?: number;
  div?: [number, number];
}

/**
 * Keeps each ramp on the same strip after the list changes. `to` maps an old
 * position to its new one, or undefined when that strip is gone; a ramp whose
 * strip is gone falls back to the default.
 */
export function remapRamps(
  ramps: Ramps | undefined,
  to: (i: number) => number | undefined,
): Ramps | undefined {
  if (!ramps) return ramps;
  const seq = ramps.seq === undefined ? undefined : to(ramps.seq);
  const a = ramps.div && to(ramps.div[0]);
  const b = ramps.div && to(ramps.div[1]);
  const div: [number, number] | undefined =
    a !== undefined && b !== undefined && a !== b ? [a, b] : undefined;
  return { ...(seq === undefined ? {} : { seq }), ...(div ? { div } : {}) };
}

export interface ChartCheck {
  id: string;
  title: string;
  value: string;
  status: "pass" | "warn" | "fail";
}

export interface Charts {
  /** Data strip keys in chart order; their scales live in System.scales. */
  keys: string[];
  /** The step each strip's mark uses: its brand step, moved toward contrast until it clears 3:1. */
  markStep: Record<Mode, Step[]>;
  marks: Record<Mode, string[]>;
  /** Ramps as the strip keys they come from, after clamping to the strips that exist. */
  seq?: string;
  div?: [string, string];
  sequential: Record<Mode, string[]>;
  diverging: Record<Mode, string[]>;
  /** For "other" and baseline series; the system fills it with the neutral solid. */
  other: Record<Mode, string>;
  /** Closest pair of marks per vision type (OKLab). */
  closest: Record<Mode, Record<Vision, { a: number; b: number; d: number }>>;
  checks: Record<Mode, ChartCheck[]>;
}

/** Sequential uses steps 3–11: step 1–2 vanish into the page, 12 is text. */
const SEQ_STEPS: Step[] = [3, 4, 5, 6, 7, 8, 9, 10, 11];
/** Diverging: arm A from strong to light, a neutral middle, arm B back to strong. */
const DIV_STEPS: Step[] = [10, 8, 6, 4];

/** A strip's mark: its brand step, or the first step past it that clears 3:1 on the page. */
function markStep(scale: BuiltScale, mode: Mode, page: string): Step {
  let k = scale.anchor[mode];
  while (k < 12 && wcagContrast(scale[mode][k - 1]!.hex, page) < 3) k++;
  return k as Step;
}

const seeOf = (hex: string) => seen(...lch(hex));

function closestPairs(marks: string[]) {
  const see = marks.map(seeOf);
  const out = {} as Record<Vision, { a: number; b: number; d: number }>;
  for (const v of VISIONS) {
    let best = { a: 0, b: 1, d: Infinity };
    for (let i = 0; i < see.length; i++)
      for (let j = i + 1; j < see.length; j++) {
        const d = dist(see[i]![v], see[j]![v]);
        if (d < best.d) best = { a: i, b: j, d };
      }
    out[v] = best;
  }
  return out;
}

/**
 * Seeds for `count` data colors, starting from the primary. Candidates are
 * hues every 15° at three lightnesses; each is built as a strip and scored on
 * its actual marks in both modes, so the pick keeps the closest pair as far
 * apart as possible for normal vision and the three color-blindness types.
 */
let memo: { key: string; seeds: string[] } | undefined;

export function suggest(
  primary: { hue: number; chroma: number; solidL?: number },
  count: number,
  pages: Record<Mode, string>,
  curve?: Curve,
): string[] {
  // A system with no data colors set rebuilds on every change; the pick only depends on these.
  const key = JSON.stringify([primary.hue, primary.chroma, primary.solidL, count, pages, curve]);
  if (memo?.key === key) return memo.seeds;
  type Cand = { seed: string; see: Record<Mode, Record<Vision, Lab>> };
  const cand = (h: number, l: number, c: number): Cand => {
    const cc = Math.min(c, clampChroma({ l, c, h }).c);
    const scale = buildScale({ hue: h, chroma: cc, solidL: l, curve });
    const see = {} as Cand["see"];
    for (const mode of ["light", "dark"] as Mode[])
      see[mode] = seeOf(scale[mode][markStep(scale, mode, pages[mode]) - 1]!.hex);
    return { seed: oklchToHex({ l, c: cc, h }), see };
  };
  const c = Math.max(0.12, Math.min(0.2, primary.chroma));
  const pool: Cand[] = [];
  for (let h = 0; h < 360; h += 15) for (const l of [0.45, 0.58, 0.72]) pool.push(cand(h, l, c));
  // A gray brand makes a poor first series; start from a plain blue instead.
  const chosen = [
    primary.chroma < 0.05
      ? cand(250, 0.5, c)
      : cand(primary.hue, primary.solidL ?? 0.55, primary.chroma),
  ];
  const gap = (p: Cand) => {
    let min = Infinity;
    for (const q of chosen)
      for (const mode of ["light", "dark"] as Mode[])
        for (const v of VISIONS) min = Math.min(min, dist(p.see[mode][v], q.see[mode][v]));
    return min;
  };
  while (chosen.length < Math.min(count, CHART_MAX)) {
    let best = pool[0]!;
    let score = -1;
    for (const p of pool) {
      const s = gap(p);
      if (s > score) [best, score] = [p, s];
    }
    chosen.push(best);
  }
  memo = { key, seeds: chosen.map((p) => p.seed) };
  return memo.seeds;
}

function check(id: string, title: string, value: string, ok: boolean, warn = false): ChartCheck {
  return { id, title, value, status: ok ? "pass" : warn ? "warn" : "fail" };
}

/** Marks, ramps and checks for the data strips, which the system has already built. */
export function buildCharts(
  keys: string[],
  scales: Partial<Record<string, BuiltScale>>,
  neutral: BuiltScale,
  pages: Record<Mode, string>,
  ramps: Ramps = {},
): Omit<Charts, "other"> {
  const at = (i: number | undefined) => (i !== undefined && keys[i] ? keys[i] : undefined);
  // A ramp whose strip is missing falls back to the first strips.
  const seq = at(ramps.seq) ?? at(0);
  const a = at(ramps.div?.[0]) ?? at(0);
  const b = at(ramps.div?.[1]) ?? at(1);
  const div: [string, string] | undefined = a && b && a !== b ? [a, b] : undefined;
  const out = {
    keys,
    seq,
    div,
    markStep: {},
    marks: {},
    sequential: {},
    diverging: {},
    closest: {},
    checks: {},
  } as Omit<Charts, "other">;
  for (const mode of ["light", "dark"] as Mode[]) {
    const page = pages[mode];
    const steps = keys.map((k) => markStep(scales[k]!, mode, page));
    const marks = keys.map((k, i) => scales[k]![mode][steps[i]! - 1]!.hex);
    out.markStep[mode] = steps;
    out.marks[mode] = marks;
    out.sequential[mode] = seq ? SEQ_STEPS.map((s) => scales[seq]![mode][s - 1]!.hex) : [];
    const arm = (k: string, order: Step[]) => order.map((s) => scales[k]![mode][s - 1]!.hex);
    out.diverging[mode] = div
      ? [...arm(div[0], DIV_STEPS), neutral[mode][1]!.hex, ...arm(div[1], DIV_STEPS.toReversed())]
      : [];

    const closest = closestPairs(marks);
    out.closest[mode] = closest;
    const checks: ChartCheck[] = [];
    if (marks.length) {
      const low = Math.min(...marks.map((h) => wcagContrast(h, page)));
      checks.push(
        check("contrast", "Marks on the page", `${low.toFixed(2)}:1 lowest, needs 3:1`, low >= 3),
      );
    }
    if (marks.length > 1) {
      const n = closest.normal.d;
      const cvd = Math.min(closest.protan.d, closest.deutan.d, closest.tritan.d);
      const ls = marks.map((h) => lch(h)[0]);
      const flat = ls.slice(1).filter((l, i) => Math.abs(l - ls[i]!) < 0.06).length;
      checks.push(
        check(
          "normal",
          "Apart, normal vision",
          `ΔE ${n.toFixed(3)}, needs 0.10`,
          n >= 0.1,
          n >= 0.06,
        ),
        check(
          "cvd",
          "Apart, color blindness",
          `ΔE ${cvd.toFixed(3)}, needs 0.06`,
          cvd >= 0.06,
          cvd >= 0.04,
        ),
        check(
          "gray",
          "Neighbours differ in lightness",
          flat
            ? `${flat} neighbouring pair${flat > 1 ? "s" : ""} under ΔL 0.06`
            : "every neighbour ΔL ≥ 0.06",
          !flat,
          true,
        ),
      );
    }
    if (div) {
      const d = out.diverging[mode];
      const ends = [seeOf(d[0]!), seeOf(d[d.length - 1]!)];
      const endGap = Math.min(...VISIONS.map((v) => dist(ends[0]![v], ends[1]![v])));
      const skew = Math.max(
        ...DIV_STEPS.map((s) =>
          Math.abs(scales[div[0]]![mode][s - 1]!.oklch.l - scales[div[1]]![mode][s - 1]!.oklch.l),
        ),
      );
      checks.push(
        check(
          "diverge",
          "Diverging ends apart for everyone",
          `ΔE ${endGap.toFixed(3)}, needs 0.06`,
          endGap >= 0.06,
          endGap >= 0.04,
        ),
        check(
          "balance",
          "Diverging arms balanced",
          `ΔL ${skew.toFixed(3)} at worst, keep under 0.04`,
          skew < 0.04,
          true,
        ),
      );
    }
    out.checks[mode] = checks;
  }
  return out;
}

function lch(hex: string): [number, number, number] {
  const r = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = r.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  const o = linearToOklch(lin);
  return [o.l, o.c, o.h];
}

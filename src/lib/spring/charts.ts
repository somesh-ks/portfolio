/**
 * Chart palettes from the brand: categorical (series), sequential (amounts)
 * and diverging (above and below a midpoint). Built the way data-viz systems
 * do it, not like UI scales:
 * - Categorical colors vary in lightness and are picked greedily so the
 *   closest pair stays as far apart as possible for normal vision and the
 *   three color-blindness types (Glasbey / iWantHue style). The order is
 *   prefix-stable, so --chart-1..3 don't change when you show 8.
 * - Every mark clears 3:1 against the page (WCAG 1.4.11).
 * - Hues and order are fixed once; light and dark only move lightness, so a
 *   series keeps its color when the theme flips.
 */
import { clampChroma, linearToOklch, oklchToHex, oklchToLinear, wcagContrast } from "./colormath";
import type { Mode } from "./color";

export const CHART_MAX = 10;
const CHART_STEPS = 9;
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

export interface ChartInput {
  /** How many categorical colors to show and grade, 4 to 10. All 10 are always exported. */
  count?: number;
  /** Hue of the diverging scale's other end. Defaults to opposite the brand. */
  diverge?: number;
}
const DEFAULT_COUNT = 8;

export interface ChartCheck {
  id: string;
  title: string;
  value: string;
  status: "pass" | "warn" | "fail";
}

export interface Charts {
  count: number;
  /** The hue the diverging scale's other end uses (picked, or the one set). */
  divergeHue: number;
  categorical: Record<Mode, string[]>;
  sequential: Record<Mode, string[]>;
  diverging: Record<Mode, string[]>;
  /** For "other" and baseline series; the system fills it with the neutral solid. */
  other: Record<Mode, string>;
  /** Closest categorical pair per vision type (OKLab), over the shown count. */
  closest: Record<Mode, Record<Vision, { a: number; b: number; d: number }>>;
  checks: Record<Mode, ChartCheck[]>;
}

// Light marks sit in L 0.45–0.66 (0.66 is about 3:1 on white); dark in 0.60–0.88.
const BAND: Record<Mode, [number, number]> = { light: [0.45, 0.66], dark: [0.6, 0.88] };
const toDark = (l: number) => 0.6 + ((l - 0.45) / 0.21) * 0.28;
const vivid = (l: number, h: number, cap: number) =>
  Math.min(cap, clampChroma({ l, c: 0.4, h }).c * 0.9);

/** Move L toward more contrast until the mark clears 3:1 on the page. */
function fit(l: number, c: number, h: number, bg: string, mode: Mode) {
  for (let i = 0; i < 40; i++) {
    const cc = Math.min(c, clampChroma({ l, c, h }).c);
    const hex = oklchToHex({ l, c: cc, h });
    if (wcagContrast(hex, bg) >= 3) return { l, c: cc, hex };
    l += mode === "light" ? -0.01 : 0.01;
  }
  const cc = clampChroma({ l, c, h }).c;
  return { l, c: cc, hex: oklchToHex({ l, c: cc, h }) };
}

interface Pick {
  h: number;
  l: Record<Mode, number>;
  c: Record<Mode, number>;
  hex: Record<Mode, string>;
  see: Record<Mode, Record<Vision, Lab>>;
}

function candidate(h: number, lLight: number, cap: number, bg: Record<Mode, string>): Pick {
  const p = { h, l: {}, c: {}, hex: {}, see: {} } as Pick;
  for (const mode of ["light", "dark"] as Mode[]) {
    const l0 = mode === "light" ? lLight : toDark(lLight);
    const f = fit(l0, vivid(l0, h, cap), h, bg[mode], mode);
    p.l[mode] = f.l;
    p.c[mode] = f.c;
    p.hex[mode] = f.hex;
    p.see[mode] = seen(f.l, f.c, h);
  }
  return p;
}

/** The smallest distance from p to any chosen color, over both modes and every vision type. */
const gap = (p: Pick, chosen: Pick[]) => {
  let min = Infinity;
  for (const q of chosen)
    for (const mode of ["light", "dark"] as Mode[])
      for (const v of VISIONS) min = Math.min(min, dist(p.see[mode][v], q.see[mode][v]));
  return min;
};

// The pool is fitted against a plain page once; final colors are re-fitted to the real page.
const PAGE: Record<Mode, string> = { light: "#fdfdfd", dark: "#131313" };
const CAP = 0.22;
let pool: Pick[] | undefined;

function categorical(hue: number): Pick[] {
  const [lo, hi] = BAND.light;
  if (!pool) {
    pool = [];
    for (let h = 0; h < 360; h += 12)
      for (let l = lo; l <= hi + 1e-9; l += 0.042) pool.push(candidate(h, l, CAP, PAGE));
  }
  const chosen = [candidate(hue, 0.55, CAP, PAGE)];
  while (chosen.length < CHART_MAX) {
    let best = pool[0]!;
    let score = -1;
    for (const p of pool) {
      const s = gap(p, chosen);
      if (s > score) [best, score] = [p, s];
    }
    chosen.push(best);
  }
  return chosen;
}

/** The other end of the diverging scale: the hue whose end color stays furthest from the brand's for everyone. */
function divergeHue(hue: number, end: Record<Mode, number>): number {
  let best = (hue + 180) % 360;
  let score = -1;
  const ends = (h: number) =>
    (["light", "dark"] as Mode[]).map((m) => seen(end[m], vivid(end[m], h, 0.2), h));
  const a = ends(hue);
  for (let d = 90; d <= 270; d += 10) {
    const h = (hue + d) % 360;
    const b = ends(h);
    const s = Math.min(...[0, 1].flatMap((i) => VISIONS.map((v) => dist(a[i]![v], b[i]![v]))));
    if (s > score) [best, score] = [h, s];
  }
  return best;
}

function ramp(n: number, f: (t: number) => { l: number; c: number; h: number }) {
  return Array.from({ length: n }, (_, i) => {
    const o = f(i / (n - 1));
    return oklchToHex(clampChroma({ l: o.l, c: o.c, h: o.h }));
  });
}

function check(id: string, title: string, value: string, ok: boolean, warn = false): ChartCheck {
  return { id, title, value, status: ok ? "pass" : warn ? "warn" : "fail" };
}

let memo: { hue: number; picks: Pick[]; other: number } | undefined;

export function buildCharts(
  accent: { hue: number; chroma: number },
  bg: Record<Mode, string>,
  input: ChartInput = {},
): Charts {
  const count = Math.min(CHART_MAX, Math.max(4, Math.round(input.count ?? DEFAULT_COUNT)));
  const hue = Math.round(accent.hue);
  const END: Record<Mode, number> = { light: 0.38, dark: 0.85 };
  // The greedy pick and the diverging search are the costly parts; they only depend on the hue.
  if (memo?.hue !== hue) memo = { hue, picks: categorical(hue), other: divergeHue(hue, END) };
  const other = input.diverge === undefined || input.diverge < 0 ? memo.other : input.diverge;
  // Re-fit the picked hues to the real page, keeping hue and order.
  const picks = memo.picks.map((p) => {
    const q: Pick = { h: p.h, see: p.see, l: { ...p.l }, c: { ...p.c }, hex: { ...p.hex } };
    for (const mode of ["light", "dark"] as Mode[]) {
      const f = fit(p.l[mode], p.c[mode], p.h, bg[mode], mode);
      q.l[mode] = f.l;
      q.c[mode] = f.c;
      q.hex[mode] = f.hex;
    }
    return q;
  });
  const c = Math.max(0.08, Math.min(0.2, accent.chroma));
  const out = {
    count,
    divergeHue: other,
    categorical: {},
    sequential: {},
    diverging: {},
    other: {},
    closest: {},
    checks: {},
  } as Charts;
  for (const mode of ["light", "dark"] as Mode[]) {
    const light = mode === "light";
    out.categorical[mode] = picks.map((p) => p.hex[mode]);
    // Sequential: lightness falls steadily from near the page to strong; chroma peaks mid-ramp.
    out.sequential[mode] = ramp(CHART_STEPS, (t) => ({
      l: light ? 0.95 - 0.65 * t : 0.3 + 0.62 * t,
      c: c * (0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, t * 0.85 + 0.1))),
      h: hue,
    }));
    // Diverging: two arms symmetric in lightness, a near-neutral middle.
    const mid = light ? 0.96 : 0.3;
    const end = END[mode];
    out.diverging[mode] = ramp(CHART_STEPS, (t) => {
      const s = Math.abs(t - 0.5) * 2;
      const h = t < 0.5 ? hue : other;
      return { l: mid + (end - mid) * s, c: 0.01 + (vivid(end, h, 0.2) - 0.01) * s ** 0.8, h };
    });

    const shown = picks.slice(0, count);
    const closest = {} as Record<Vision, { a: number; b: number; d: number }>;
    for (const v of VISIONS) {
      let best = { a: 0, b: 1, d: Infinity };
      for (let i = 0; i < shown.length; i++)
        for (let j = i + 1; j < shown.length; j++) {
          const d = dist(shown[i]!.see[mode][v], shown[j]!.see[mode][v]);
          if (d < best.d) best = { a: i, b: j, d };
        }
      closest[v] = best;
    }
    out.closest[mode] = closest;
    const low = Math.min(...shown.map((p) => wcagContrast(p.hex[mode], bg[mode])));
    const flatPairs = shown
      .slice(1)
      .filter((p, i) => Math.abs(p.l[mode] - shown[i]!.l[mode]) < 0.06).length;
    const ends = seen(...lch(out.diverging[mode][0]!));
    const ends2 = seen(...lch(out.diverging[mode][CHART_STEPS - 1]!));
    const endGap = Math.min(...VISIONS.map((v) => dist(ends[v], ends2[v])));
    const n = closest.normal.d;
    const cvd = Math.min(closest.protan.d, closest.deutan.d, closest.tritan.d);
    out.checks[mode] = [
      check("contrast", "Marks on the page", `${low.toFixed(2)}:1 lowest, needs 3:1`, low >= 3),
      check(
        "normal",
        "Series apart, normal vision",
        `ΔE ${n.toFixed(3)}, needs 0.10`,
        n >= 0.1,
        n >= 0.06,
      ),
      check(
        "cvd",
        "Series apart, color blindness",
        `ΔE ${cvd.toFixed(3)}, needs 0.06`,
        cvd >= 0.06,
        cvd >= 0.04,
      ),
      check(
        "gray",
        "Neighbours differ in lightness",
        flatPairs
          ? `${flatPairs} neighbouring pair${flatPairs > 1 ? "s" : ""} under ΔL 0.06`
          : "every neighbour ΔL ≥ 0.06",
        !flatPairs,
        true,
      ),
      check(
        "diverge",
        "Diverging ends apart for everyone",
        `ΔE ${endGap.toFixed(3)}, needs 0.06`,
        endGap >= 0.06,
        endGap >= 0.04,
      ),
    ];
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

/**
 * Color engine. Generates 12-step OKLCH scales whose steps have fixed jobs
 * (backgrounds 1-2, component fills 3-5, borders 6-8, solids 9-10, text 11-12),
 * separately for light and dark, then maps them to semantic roles and checks
 * every pair that will actually be drawn together against WCAG 2.2.
 */
import { clampChroma, oklchToHex, parseCss, wcagContrast } from "./colormath";

export interface Oklch {
  l: number;
  c: number;
  h: number;
}

export type Mode = "light" | "dark";
export type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export const STEPS: Step[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** What each step is for. Shown in the UI and written into DESIGN.md. */
export const STEP_JOBS: Record<Step, string> = {
  1: "App background",
  2: "Subtle background",
  3: "Component background",
  4: "Hovered component",
  5: "Pressed or selected component",
  6: "Subtle border, separators",
  7: "Component border",
  8: "Strong border, focus ring",
  9: "Solid fill (the brand color)",
  10: "Hovered solid fill",
  11: "Low-contrast text",
  12: "High-contrast text",
};

/**
 * A palette is one curve, not a table. Lightness runs from the page end of the
 * scale to the text end along an easing curve (a CSS cubic-bezier: x is the
 * step, y is how far along the lightness range it is), so every step moves
 * the same way and every hue shares the same lightness steps. Chroma rises to
 * the brand step and falls toward both ends; hue can drift across the scale.
 */
export interface Curve {
  /** cubic-bezier(x1, y1, x2, y2) applied to lightness. */
  bezier: [number, number, number, number];
  /** Degrees the hue turns from step 1 to step 12, centred on the brand step. */
  hueShift: number;
}

/** Slow through the backgrounds, faster through borders and solids, a long reach to text. */
export const DEFAULT_CURVE: Curve = { bezier: [0.4, 0.08, 0.9, 0.6], hueShift: 0 };

// Where each mode's scale starts (page) and ends (strongest text).
export const ENDS: Record<Mode, [number, number]> = { light: [0.993, 0.24], dark: [0.165, 0.95] };

/** y for a given x on a CSS cubic-bezier from (0,0) to (1,1). */
const cubic = (a: number, b: number, t: number) =>
  3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;

export function bezierAt([x1, y1, x2, y2]: Curve["bezier"], x: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (cubic(x1, x2, mid) < x) lo = mid;
    else hi = mid;
  }
  return cubic(y1, y2, (lo + hi) / 2);
}

export interface Swatch {
  step: Step;
  oklch: Oklch;
  hex: string;
  css: string;
  /** True when chroma was reduced to fit sRGB. */
  clipped: boolean;
}

type Scale = Record<Mode, Swatch[]>;

const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

function fit(color: Oklch): { oklch: Oklch; clipped: boolean } {
  const c = clampChroma(color).c;
  return { oklch: { l: color.l, c, h: color.h }, clipped: c < color.c - 0.002 };
}

export function swatch(step: Step, color: Oklch): Swatch {
  const { oklch, clipped } = fit(color);
  const hex = oklchToHex(oklch);
  return {
    step,
    oklch,
    hex,
    css: `oklch(${round(oklch.l * 100, 1)}% ${round(oklch.c, 3)} ${round(oklch.h, 1)})`,
    clipped,
  };
}

export function parseColor(input: string): Oklch | null {
  return parseCss(input);
}

export interface ScaleInput {
  hue: number;
  /** Peak chroma, around 0.02 (neutral) to 0.25 (vivid). */
  chroma: number;
  /** Lightness of the brand color; the scale bends to pass through it exactly. */
  solidL?: number;
  curve?: Curve;
}

/** Yellows and limes only look like themselves when light; other hues sit mid-scale. */
function defaultSolidL(hue: number): number {
  const h = ((hue % 360) + 360) % 360;
  return h > 80 && h < 130 ? 0.86 : 0.55;
}

/** Steps a brand color may land on: never the page backgrounds or the strongest text. */
const ANCHORS = [3, 4, 5, 6, 7, 8, 9, 10] as const;

export interface BuiltScale extends Scale {
  /** The step the brand color landed on, per mode. */
  anchor: Record<Mode, Step>;
  /** What the scale was built from, for the headless export. */
  seed: { hue: number; chroma: number; l: number };
}

export function buildScale({ hue, chroma, solidL, curve = DEFAULT_CURVE }: ScaleInput): BuiltScale {
  const target = solidL ?? defaultSolidL(hue);
  const e = STEPS.map((_, i) => bezierAt(curve.bezier, i / 11));
  const out = { anchor: {}, seed: { hue, chroma, l: target } } as BuiltScale;
  for (const mode of ["light", "dark"] as Mode[]) {
    const [from, to] = ENDS[mode];
    const raw = e.map((y) => from + (to - from) * y);
    // Land the brand on the step whose lightness is closest to it.
    const k = ANCHORS.reduce((best, s) =>
      Math.abs(raw[s - 1]! - target) < Math.abs(raw[best - 1]! - target) ? s : best,
    );
    const ek = e[k - 1]!;
    const lb = Math.min(Math.max(target, Math.min(from, to) + 0.02), Math.max(from, to) - 0.02);
    // Bend the curve through the brand: each side is rescaled, so the order of steps holds.
    const l = e.map((y, i) =>
      i < k - 1
        ? from + (lb - from) * (ek ? y / ek : 0)
        : lb + (to - lb) * (ek < 1 ? (y - ek) / (1 - ek) : 0),
    );
    const tk = (k - 1) / 11;
    out.anchor[mode] = k;
    out[mode] = STEPS.map((step, i) => {
      const t = i / 11;
      // Chroma peaks at the brand step; text keeps some hue, backgrounds almost none.
      const w = t < tk ? Math.max(tk, 0.35) : 0.55;
      const share = Math.max(0.05, 1 - ((t - tk) / w) ** 2);
      return swatch(step, {
        l: l[i]!,
        c: chroma * share,
        h: (((hue + curve.hueShift * (t - tk)) % 360) + 360) % 360,
      });
    });
  }
  return out;
}

/** A gray tinted toward the accent hue. tint 0 = pure gray, 1 = clearly tinted. */
export function buildNeutral(hue: number, tint: number, curve?: Curve): BuiltScale {
  return buildScale({ hue, chroma: 0.004 + tint * 0.026, solidL: 0.62, curve });
}

export function contrast(a: string, b: string): number {
  return wcagContrast(a, b);
}

/** OKLab distance; below ~0.02 two colors are hard to tell apart. */
export function distance(a: string, b: string): number {
  const x = parseColor(a);
  const y = parseColor(b);
  if (!x || !y) return Infinity;
  const ax = x.c * Math.cos((x.h * Math.PI) / 180);
  const ay = x.c * Math.sin((x.h * Math.PI) / 180);
  const bx = y.c * Math.cos((y.h * Math.PI) / 180);
  const by = y.c * Math.sin((y.h * Math.PI) / 180);
  return Math.hypot(x.l - y.l, ax - bx, ay - by);
}

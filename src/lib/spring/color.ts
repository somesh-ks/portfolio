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

// Lightness targets per step. Light runs near-white to ink; dark is generated,
// not inverted: its surfaces step up in smaller increments because the eye
// separates dark values less well.
const L: Record<Mode, number[]> = {
  light: [0.993, 0.982, 0.961, 0.937, 0.91, 0.876, 0.83, 0.765, 0, 0, 0.52, 0.27],
  dark: [0.172, 0.198, 0.245, 0.281, 0.316, 0.362, 0.425, 0.52, 0, 0, 0.8, 0.945],
};
// Share of the scale's peak chroma per step. Backgrounds stay near-neutral,
// borders and solids carry the hue, high-contrast text desaturates.
const C: Record<Mode, number[]> = {
  light: [0.05, 0.11, 0.24, 0.36, 0.48, 0.58, 0.7, 0.86, 1, 1, 0.92, 0.5],
  dark: [0.18, 0.24, 0.42, 0.56, 0.66, 0.72, 0.8, 0.9, 1, 1, 0.78, 0.34],
};

export interface Swatch {
  step: Step;
  oklch: Oklch;
  hex: string;
  css: string;
  /** True when chroma was reduced to fit sRGB. */
  clipped: boolean;
}

export type Scale = Record<Mode, Swatch[]>;

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
  /** Lightness of the solid step 9. Defaults suit most hues. */
  solidL?: number;
}

/** Hues where a bright solid reads well (yellows, limes, cyans) get a lighter step 9. */
function defaultSolidL(hue: number, mode: Mode): number {
  const h = ((hue % 360) + 360) % 360;
  // Yellows and limes only look like themselves when light (and take dark text);
  // everything else sits low enough for white text.
  void mode;
  return isBrightHue(h) ? 0.86 : 0.55;
}

function isBrightHue(hue: number): boolean {
  const h = ((hue % 360) + 360) % 360;
  return h > 80 && h < 130;
}

export function buildScale({ hue, chroma, solidL }: ScaleInput): Scale {
  const out = {} as Scale;
  for (const mode of ["light", "dark"] as Mode[]) {
    const s9 = solidL ?? defaultSolidL(hue, mode);
    out[mode] = STEPS.map((step, i) => {
      let l = L[mode][i]!;
      if (step === 9) l = s9;
      // Hover moves toward more contrast with the label: darker under white text, lighter under ink.
      if (step === 10) l = s9 > 0.75 ? Math.min(0.97, s9 + 0.03) : s9 - 0.04;
      return swatch(step, { l, c: chroma * C[mode][i]!, h: hue });
    });
  }
  return out;
}

/** A gray tinted toward the accent hue. tint 0 = pure gray, 1 = clearly tinted. */
export function buildNeutral(hue: number, tint: number): Scale {
  return buildScale({ hue, chroma: 0.004 + tint * 0.026, solidL: 0.64 });
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

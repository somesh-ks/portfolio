/**
 * Type engine. A ratio ladder is only the start: every role also gets its own
 * line height (snapped to a 4px grid), tracking (tighter as size grows),
 * a fluid clamp() that still honours browser zoom, and a metric-matched
 * fallback font so swapping fonts doesn't shift the layout.
 */
import { FALLBACKS, FONTS } from "./fonts.data";

export type FontName = keyof typeof FONTS;
export const FONT_NAMES = Object.keys(FONTS) as FontName[];

export type Role =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "body-lg"
  | "body"
  | "label"
  | "caption"
  | "code";

export const ROLE_JOBS: Record<Role, string> = {
  display: "Hero and marketing headlines, once per page",
  h1: "Page title",
  h2: "Section title",
  h3: "Card and group title",
  "body-lg": "Lead paragraphs and intros",
  body: "Running text",
  label: "Buttons, inputs, tabs, menus",
  caption: "Metadata, helper text, timestamps",
  code: "Inline code and code blocks",
};

// Step on the ratio ladder for each role (0 = base size).
const STEP: Record<Role, number> = {
  display: 6,
  h1: 4,
  h2: 3,
  h3: 2,
  "body-lg": 1,
  body: 0,
  label: -0.5,
  caption: -1.5,
  code: -0.5,
};

export interface TypeInput {
  body: FontName;
  heading: FontName;
  mono: FontName;
  /** Body size in px at desktop. */
  base: number;
  /** Desktop ratio; phones use a gentler one so headings don't dominate. */
  ratio: number;
  headingWeight: number;
  fluid: boolean;
}

interface TypeToken {
  role: Role;
  family: FontName;
  weight: number;
  /** px at the smallest and largest viewport. Equal when not fluid. */
  min: number;
  max: number;
  /** CSS font-size value: px/rem, or clamp(). */
  size: string;
  /** Unitless line height at the max size. */
  lineHeight: number;
  /** Line height in px at max size, on the 4px grid. */
  lineHeightPx: number;
  /** em */
  tracking: number;
}

export interface TypeSystem {
  tokens: TypeToken[];
  fallbacks: Record<"body" | "heading" | "mono", { family: string; css: string }>;
  notes: string[];
  /** Body size that matches Inter's x-height at 16px, for the chosen body font. */
  opticalBase: number;
}

const VIEWPORT = { min: 360, max: 1280 };
const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
const rem = (px: number) => `${round(px / 16, 4)}rem`;

/** Line height ratio falls as size grows: 1.6 for small text, about 1.1 for display. */
function lineHeightFor(size: number, cap = 1.6): { ratio: number; px: number } {
  const target = size * Math.min(cap, Math.max(1.1, 1 + 8 / size));
  // 4px grid for large text, 2px below 20px where 4px steps are too coarse.
  const grid = size >= 20 ? 4 : 2;
  const px = Math.max(grid, Math.round(target / grid) * grid);
  return { ratio: round(px / size, 3), px };
}

/**
 * Tracking from Rasmus Andersson's dynamic metrics for Inter:
 * a + b * e^(c * size). Serif and display faces get half the adjustment,
 * monospace none, because their spacing is already set for their job.
 */
function trackingFor(size: number, tag: string): number {
  const t = -0.0223 + 0.185 * Math.exp(-0.1745 * size);
  const scale = tag === "mono" ? 0 : tag === "serif" ? 0.5 : 1;
  return round(t * scale, 3);
}

function fluidClamp(min: number, max: number): string {
  if (Math.abs(max - min) < 0.5) return rem(max);
  const slope = (max - min) / (VIEWPORT.max - VIEWPORT.min);
  const intercept = min - slope * VIEWPORT.min;
  // rem intercept keeps zoom working (WCAG 1.4.4); pure vw would not scale.
  return `clamp(${rem(min)}, ${rem(intercept)} + ${round(slope * 100, 4)}vw, ${rem(max)})`;
}

function weightFor(font: FontName, wanted: number): number {
  const ws = FONTS[font].weights as readonly number[];
  return ws.reduce(
    (best, w) => (Math.abs(w - wanted) < Math.abs(best - wanted) ? w : best),
    ws[0]!,
  );
}

const pct = (n: number) => `${round(n * 100, 2)}%`;

function fallbackFor(font: FontName) {
  const f = FONTS[font];
  const fbName = f.tag === "serif" ? "Times New Roman" : f.tag === "mono" ? "Courier New" : "Arial";
  const fb = FALLBACKS[fbName];
  // Match x-width so line breaks don't move when the web font arrives.
  const sizeAdjust = f.xWidthAvg / f.unitsPerEm / (fb.xWidthAvg / fb.unitsPerEm);
  const family = `${font} Fallback`;
  const css = [
    `@font-face {`,
    `  font-family: "${family}";`,
    `  src: local("${fbName}");`,
    `  size-adjust: ${pct(sizeAdjust)};`,
    `  ascent-override: ${pct(f.ascent / f.unitsPerEm / sizeAdjust)};`,
    `  descent-override: ${pct(Math.abs(f.descent) / f.unitsPerEm / sizeAdjust)};`,
    `  line-gap-override: ${pct(f.lineGap / f.unitsPerEm / sizeAdjust)};`,
    `}`,
  ].join("\n");
  return { family, css };
}

export function opticalBase(font: FontName): number {
  const ref = (FONTS.Inter.xHeight / FONTS.Inter.unitsPerEm) * 16;
  const own = FONTS[font].xHeight / FONTS[font].unitsPerEm;
  return round(ref / own, 1);
}

export function buildType(input: TypeInput): TypeSystem {
  const mobileRatio = 1 + (input.ratio - 1) * 0.72;
  const notes: string[] = [];
  const tokens = (Object.keys(STEP) as Role[]).map((role) => {
    const family =
      role === "code"
        ? input.mono
        : ["display", "h1", "h2", "h3"].includes(role)
          ? input.heading
          : input.body;
    const n = STEP[role];
    // Small roles don't shrink on phones; only headings get the gentler ratio.
    const max = Math.max(12, Math.round(input.base * input.ratio ** n));
    const min =
      input.fluid && n > 0 ? Math.max(12, Math.round(input.base * mobileRatio ** n)) : max;
    // Single-line UI text sits tighter than running text.
    const lh = lineHeightFor(max, role === "label" ? 1.45 : 1.6);
    const heading = ["display", "h1", "h2", "h3"].includes(role);
    const weight = weightFor(family, heading ? input.headingWeight : role === "label" ? 500 : 400);
    return {
      role,
      family,
      weight,
      min,
      max,
      size: input.fluid ? fluidClamp(min, max) : rem(max),
      lineHeight: lh.ratio,
      lineHeightPx: lh.px,
      tracking: trackingFor(max, FONTS[family].tag),
    } satisfies TypeToken;
  });

  for (const t of tokens) {
    if (t.max / t.min > 2.5)
      notes.push(`${t.role}: max is over 2.5× min, which can break 200% zoom.`);
  }
  const ob = opticalBase(input.body);
  if (Math.abs(ob - input.base) >= 1) {
    notes.push(
      `${input.body} reads ${ob > input.base ? "smaller" : "larger"} than its px size. ${ob}px matches the x-height of Inter at 16px.`,
    );
  }
  return {
    tokens,
    fallbacks: {
      body: fallbackFor(input.body),
      heading: fallbackFor(input.heading),
      mono: fallbackFor(input.mono),
    },
    notes,
    opticalBase: ob,
  };
}

export function fontStack(font: FontName): string {
  const tag = FONTS[font].tag;
  const generic =
    tag === "serif"
      ? "ui-serif, Georgia, serif"
      : tag === "mono"
        ? "ui-monospace, monospace"
        : "ui-sans-serif, system-ui, sans-serif";
  return `"${font}", "${font} Fallback", ${generic}`;
}

export function googleFontsUrl(fonts: FontName[]): string {
  const uniq = [...new Set(fonts)].sort();
  const fam = uniq
    .map((f) => {
      const d = FONTS[f] as { weights: readonly number[]; variable: readonly number[] | null };
      // Variable fonts take a range; static ones list their cuts.
      const span = d.variable
        ? `:wght@${d.variable[0]}..${d.variable[1]}`
        : d.weights.length > 1
          ? `:wght@${d.weights.join(";")}`
          : "";
      return `family=${f.replace(/ /g, "+")}${span}`;
    })
    .join("&");
  return `https://fonts.googleapis.com/css2?${fam}&display=swap`;
}

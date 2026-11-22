/**
 * Minimal OKLCH math for the token inspector: OKLCH -> sRGB, gamut fitting
 * and WCAG 2 contrast. Pure functions, no dependencies, unit-tested.
 */
export interface Oklch {
  l: number;
  c: number;
  h: number;
}

type Rgb = [number, number, number];

function oklchToLinearSrgb({ l, c, h }: Oklch): Rgb {
  const radians = (h * Math.PI) / 180;
  const a = c * Math.cos(radians);
  const b = c * Math.sin(radians);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const EPSILON = 0.0005;

export function inGamut(color: Oklch): boolean {
  return oklchToLinearSrgb(color).every((channel) => channel >= -EPSILON && channel <= 1 + EPSILON);
}

/** Reduce chroma until the colour fits sRGB, keeping lightness and hue. */
function fitGamut(color: Oklch): Oklch {
  if (inGamut(color)) return color;
  let low = 0;
  let high = color.c;
  for (let step = 0; step < 24; step++) {
    const mid = (low + high) / 2;
    if (inGamut({ ...color, c: mid })) low = mid;
    else high = mid;
  }
  return { ...color, c: low };
}

function relativeLuminance(color: Oklch): number {
  const [r, g, b] = oklchToLinearSrgb(color).map((channel) =>
    Math.min(1, Math.max(0, channel)),
  ) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: Oklch, b: Oklch): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const RAMP_LIGHTNESS = [0.975, 0.94, 0.88, 0.8, 0.7, 0.6, 0.5, 0.42, 0.34, 0.26, 0.2];

/** 11-step ramp: fixed lightness per step, chroma eased toward the ends so
 * pale and deep steps stay in gamut instead of clipping. */
export function buildRamp(hue: number, chroma: number): { step: number; color: Oklch }[] {
  return RAMP_STEPS.map((step, index) => {
    const l = RAMP_LIGHTNESS[index] ?? 0.5;
    const distance = Math.abs(index - 5) / 5;
    const eased = chroma * (1 - distance ** 2 * 0.75);
    return { step, color: fitGamut({ l, c: eased, h: hue }) };
  });
}

export function formatOklch({ l, c, h }: Oklch): string {
  return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${Math.round(h)})`;
}

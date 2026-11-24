/**
 * The few color conversions Spring needs, without a library: OKLCH to and
 * from sRGB hex, gamut fitting by chroma, parsing common CSS colors, and
 * WCAG 2 contrast. Matches culori's results to the third decimal.
 */
export interface Lch {
  l: number;
  c: number;
  h: number;
}

type Rgb = [number, number, number];

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

function oklchToLinear({ l, c, h }: Lch): Rgb {
  const r = (h * Math.PI) / 180;
  const a = c * Math.cos(r);
  const b = c * Math.sin(r);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

function linearToOklch([r, g, b]: Rgb): Lch {
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.hypot(A, B);
  const h = c < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

const EPS = 0.0001;
const inGamut = (c: Lch) => oklchToLinear(c).every((v) => v >= -EPS && v <= 1 + EPS);

/** Lower chroma until the color fits sRGB; lightness and hue stay. */
export function clampChroma(color: Lch): Lch {
  if (inGamut(color)) return color;
  let lo = 0;
  let hi = color.c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ ...color, c: mid })) lo = mid;
    else hi = mid;
  }
  return { ...color, c: lo };
}

const byte = (v: number) =>
  Math.round(Math.min(1, Math.max(0, toGamma(v))) * 255)
    .toString(16)
    .padStart(2, "0");

export function oklchToHex(c: Lch): string {
  const [r, g, b] = oklchToLinear(c);
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

function hexToRgb(hex: string): Rgb | null {
  let h = hex.replace("#", "");
  if (h.length === 3 || h.length === 4)
    h = h
      .slice(0, 3)
      .split("")
      .map((x) => x + x)
      .join("");
  if (h.length === 8) h = h.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Rgb;
}

const NAMED: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  transparent: "#ffffff",
};
const num = (s: string, scale = 1) =>
  s.endsWith("%") ? (parseFloat(s) / 100) * scale : parseFloat(s);

/** Hex, rgb(), hsl(), oklch() and a few names. Alpha is ignored. */
export function parseCss(input: string): Lch | null {
  const s = input.trim().toLowerCase();
  if (NAMED[s]) return parseCss(NAMED[s]!);
  if (s.startsWith("#")) {
    const rgb = hexToRgb(s);
    return rgb ? linearToOklch(rgb.map(toLinear) as Rgb) : null;
  }
  const m = s.match(/^(rgba?|hsla?|oklch)\(([^)]+)\)$/);
  if (!m) return null;
  const parts = m[2]!.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  if (m[1] === "oklch") {
    const l = num(parts[0]!, 1);
    return { l, c: num(parts[1]!, 0.4), h: parseFloat(parts[2]!) || 0 };
  }
  if (m[1]!.startsWith("rgb")) {
    const rgb = parts
      .slice(0, 3)
      .map((p) => (p.endsWith("%") ? parseFloat(p) / 100 : parseFloat(p) / 255)) as Rgb;
    return linearToOklch(rgb.map(toLinear) as Rgb);
  }
  const h = parseFloat(parts[0]!) / 360;
  const sat = parseFloat(parts[1]!) / 100;
  const lig = parseFloat(parts[2]!) / 100;
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return lig - sat * Math.min(lig, 1 - lig) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return linearToOklch([f(0), f(8), f(4)].map(toLinear) as Rgb);
}

function luminance(color: string): number {
  const rgb = color.trim().startsWith("#") ? hexToRgb(color.trim()) : null;
  const c = rgb ? null : parseCss(color);
  if (!rgb && !c) return 0;
  // OKLCH outside sRGB keeps its true luminance (what WCAG tools such as colorjs report).
  const [r, g, b] = rgb ? (rgb.map(toLinear) as Rgb) : oklchToLinear(c!);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function wcagContrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

// APCA's soft clamp for near-black: its own constant, not √2.
const APCA_BLACK_CLAMP = 1414 / 1000;
/** APCA screen luminance, with near-black lifted. */
function apcaY(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;
  const v = 0.2126729 * rgb[0] ** 2.4 + 0.7151522 * rgb[1] ** 2.4 + 0.072175 * rgb[2] ** 2.4;
  return v < 0.022 ? v + (0.022 - v) ** APCA_BLACK_CLAMP : v;
}

/**
 * APCA (0.0.98G-4g) lightness contrast of text `fg` on `bg`, as an absolute Lc
 * from 0 to about 106. Unlike the WCAG ratio, it knows dark text on light reads
 * differently from light text on dark.
 */
export function apcaContrast(fg: string, bg: string): number {
  const t = apcaY(fg);
  const b = apcaY(bg);
  if (Math.abs(b - t) < 0.0005) return 0;
  const sapc = b > t ? (b ** 0.56 - t ** 0.57) * 1.14 : (b ** 0.65 - t ** 0.62) * 1.14;
  if (Math.abs(sapc) < 0.1) return 0;
  return Math.abs((sapc > 0 ? sapc - 0.027 : sapc + 0.027) * 100);
}

/** sRGB hex as [hue 0–360, saturation 0–1, lightness 0–1]. */
export function hexToHsl(hex: string): [number, number, number] {
  const rgb = hexToRgb(hex) ?? [0, 0, 0];
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const [r, g, b] = rgb;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

const hexByte = (v: number) =>
  Math.round(Math.min(1, Math.max(0, v)) * 255)
    .toString(16)
    .padStart(2, "0");

export function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return `#${hexByte(f(0))}${hexByte(f(8))}${hexByte(f(4))}`;
}

export type ColorFormat = "oklch" | "hsl" | "hex";

/** One color written the way the visitor chose to read colors. */
export function formatColor(hex: string, format: ColorFormat): string {
  if (format === "hex") return hex;
  if (format === "hsl") {
    const [h, s, l] = hexToHsl(hex);
    return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
  }
  const c = parseCss(hex)!;
  return `oklch(${Math.round(c.l * 1000) / 10}% ${Math.round(c.c * 1000) / 1000} ${Math.round(c.h)})`;
}

/** The alpha of a CSS color, 1 when it has none. */
function alphaOf(input: string): number {
  const s = input.trim().toLowerCase();
  if (s === "transparent") return 0;
  const hex = s.match(/^#([0-9a-f]{4}|[0-9a-f]{8})$/);
  if (hex) {
    const a = hex[1]!.length === 4 ? hex[1]!.slice(3).repeat(2) : hex[1]!.slice(6);
    return parseInt(a, 16) / 255;
  }
  const fn = s.match(/^(?:rgba?|hsla?|oklch)\(([^)]+)\)$/);
  if (!fn) return 1;
  const slash = fn[1]!.split("/")[1];
  const commas = fn[1]!.split(",");
  const a = slash ?? (commas.length === 4 ? commas[3] : undefined);
  if (a === undefined) return 1;
  const n = num(a.trim(), 1);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
}

const gamma = (c: Lch) => oklchToLinear(c).map((v) => toGamma(Math.min(1, Math.max(0, v))));

/**
 * `fg` painted over `bg`, as the opaque color the eye sees. Browsers blend in
 * gamma-encoded sRGB, so this does too. Unreadable input comes back unchanged.
 */
export function over(fg: string, bg: string): string {
  const a = alphaOf(fg);
  const f = parseCss(fg);
  const b = parseCss(bg);
  if (a >= 1 || !f || !b) return fg;
  const [fr, fgr, fb] = gamma(f);
  const [br, bgr, bb] = gamma(b);
  const mix = (x: number, y: number) => ((x * a + y * (1 - a)) * 255).toFixed(3);
  return `rgb(${mix(fr!, br!)} ${mix(fgr!, bgr!)} ${mix(fb!, bb!)})`;
}

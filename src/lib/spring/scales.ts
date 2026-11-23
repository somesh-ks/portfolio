/**
 * Space, shape, depth and motion. Each comes from one dial (density,
 * roundness, motion energy) plus rules, because most systems need sane
 * relationships here more than fine control.
 */

const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export interface Space {
  unit: number;
  scale: Record<string, number>;
  control: { sm: number; md: number; lg: number };
  paddingX: { sm: number; md: number; lg: number };
  gutter: number;
  section: number;
  breakpoints: Record<string, number>;
  measure: string;
}

/** Spacing stays on a 4px grid; density moves control sizes and gaps, not the grid. */
export function buildSpace(density: number): Space {
  const d = clamp01(density);
  const unit = 4;
  const scale: Record<string, number> = {};
  for (const n of [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24])
    scale[String(n)] = n * unit;
  // 0 = compact (dashboards), 0.5 = default, 1 = comfortable (marketing).
  const md = 32 + Math.round(d * 2) * 4;
  return {
    unit,
    scale,
    control: { sm: md - 8, md, lg: md + 8 },
    paddingX: { sm: 8, md: md >= 40 ? 16 : 12, lg: md >= 40 ? 20 : 16 },
    gutter: d < 0.34 ? 16 : d < 0.67 ? 24 : 32,
    section: d < 0.34 ? 48 : d < 0.67 ? 80 : 120,
    breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280 },
    measure: "65ch",
  };
}

export interface Shape {
  radius: { none: number; sm: number; md: number; lg: number; xl: number; full: number };
  border: { hairline: number; default: number; strong: number };
}

export function buildShape(roundness: number): Shape {
  const r = clamp01(roundness);
  const md = Math.round((r * 16) / 2) * 2;
  return {
    radius: {
      none: 0,
      sm: Math.round(md / 2 / 2) * 2,
      md,
      lg: Math.round((md * 1.5) / 2) * 2,
      xl: md * 2,
      full: 9999,
    },
    border: { hairline: 1, default: 1, strong: 2 },
  };
}

interface ShadowLayer {
  x: number;
  y: number;
  blur: number;
  spread: number;
  /** OKLCH components and alpha */
  color: { l: number; c: number; h: number; alpha: number };
}

export interface Shadow {
  sm: string;
  md: string;
  lg: string;
  layers: Record<"sm" | "md" | "lg", ShadowLayer[]>;
}

/** Shadows use the neutral hue, never pure black, so they sit in the palette. */
export function buildShadows(neutralHue: number, mode: "light" | "dark"): Shadow {
  const a = mode === "light" ? 1 : 2.4;
  const h = round(neutralHue, 1);
  const layer = (y: number, blur: number, alpha: number): ShadowLayer => ({
    x: 0,
    y,
    blur,
    spread: 0,
    color: { l: 0.22, c: 0.02, h, alpha: round(Math.min(alpha * a, 0.7), 3) },
  });
  const layers = {
    sm: [layer(1, 2, 0.06)],
    md: [layer(2, 4, 0.05), layer(4, 12, 0.07)],
    lg: [layer(4, 8, 0.05), layer(12, 32, 0.12)],
  };
  const css = (ls: ShadowLayer[]) =>
    ls.map((l) => `${l.x} ${l.y}px ${l.blur}px oklch(22% 0.02 ${h} / ${l.color.alpha})`).join(", ");
  return { sm: css(layers.sm), md: css(layers.md), lg: css(layers.lg), layers };
}

export interface Motion {
  /** ms; `spring` is the spring's settle time, the duration `--ease-spring` needs. */
  duration: { instant: number; fast: number; base: number; slow: number; spring: number };
  easing: { out: string; inOut: string; spring: string };
  /** Spring parameters behind `spring`, for libraries that take them. */
  springConfig: { stiffness: number; damping: number; mass: number };
}

/** Sample a damped spring into a CSS linear() easing. */
function springLinear(
  stiffness: number,
  damping: number,
  mass = 1,
  points = 40,
): { easing: string; duration: number } {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const x = (t: number) => {
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return (
        1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
      );
    }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  };
  // Settle time: when the envelope is within 0.1% of rest.
  let settle = 0;
  for (let t = 0; t < 5; t += 0.005) {
    let still = true;
    for (let u = t; u < t + 0.3; u += 0.02) if (Math.abs(1 - x(u)) > 0.001) still = false;
    if (still) {
      settle = t;
      break;
    }
  }
  settle ||= 1;
  const samples = Array.from({ length: points + 1 }, (_, i) =>
    round(i === points ? 1 : x((i / points) * settle), 3),
  );
  return { easing: `linear(${samples.join(", ")})`, duration: Math.round(settle * 1000) };
}

export function buildMotion(energy: number): Motion {
  const e = clamp01(energy);
  // Calm systems move slower and never overshoot; lively ones are quicker with a little bounce.
  const fast = Math.round(160 - e * 60);
  const base = Math.round(240 - e * 60);
  const slow = Math.round(360 - e * 60);
  const stiffness = Math.round(170 + e * 230);
  const damping = round(2 * Math.sqrt(stiffness) * (1 - e * 0.35), 1);
  const spring = springLinear(stiffness, damping);
  return {
    duration: { instant: 0, fast, base, slow, spring: spring.duration },
    easing: {
      out: "cubic-bezier(0.22, 1, 0.36, 1)",
      inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
      spring: spring.easing,
    },
    springConfig: { stiffness, damping, mass: 1 },
  };
}

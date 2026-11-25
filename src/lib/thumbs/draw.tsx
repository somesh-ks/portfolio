/**
 * Drawing kit for homepage hover thumbnails. Every thumb is inline SVG in a
 * 320×200 viewBox shown at 160×100, so 1 unit = 0.5 CSS px: keep text at 16+
 * units and pixel cells at 4+ units. Colours come from CSS classes (see
 * `.thumb` in components.css), so light and dark follow the site theme.
 * The full recipe lives in .agents/skills/thumbnails/SKILL.md.
 */
import type { ReactNode } from "react";

export const W = 320;
export const H = 200;

/** Theme roles. `accent` is the row's own colour, `on` sits on top of it. */
export type Tone = "ink" | "muted" | "line" | "bg" | "accent" | "on";

/** The row accent mixed toward the canvas (tint) or toward white/black (ramp steps). */
export const tint = (percent: number, toward = "var(--surface-canvas)") =>
  `color-mix(in oklch, var(--thumb-accent) ${percent}%, ${toward})`;

/** A tone name becomes a class; anything else is a raw CSS colour expression. */
const paint = (tone: Tone | string) =>
  ["ink", "muted", "line", "bg", "accent", "on"].includes(tone)
    ? { className: `thumb-${tone}` }
    : { style: { fill: tone } };

export function Box({
  x,
  y,
  w,
  h,
  tone = "ink",
  stroke,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tone?: Tone | string;
  /** Draw an outline of this width instead of a fill. */
  stroke?: number;
}) {
  if (stroke) {
    const inset = stroke / 2;
    return (
      <rect
        x={x + inset}
        y={y + inset}
        width={w - stroke}
        height={h - stroke}
        className={`thumb-stroke-${tone}`}
        strokeWidth={stroke}
        fill="none"
      />
    );
  }
  return <rect x={x} y={y} width={w} height={h} {...paint(tone)} />;
}

/** Geist Mono. Use for commands, labels, code. */
export function Mono({
  x,
  y,
  size = 20,
  tone = "ink",
  children,
}: {
  x: number;
  y: number;
  size?: number;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <text x={x} y={y} fontSize={size} className={`thumb-mono thumb-${tone}`}>
      {children}
    </text>
  );
}

/** Geist 600. Use for one big figure ("4x", "57%", "Aa"). */
export function Display({
  x,
  y,
  size = 52,
  tone = "ink",
  anchor,
  children,
}: {
  x: number;
  y: number;
  size?: number;
  tone?: Tone;
  anchor?: "middle" | "end";
  children: ReactNode;
}) {
  return (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} className={`thumb-display thumb-${tone}`}>
      {children}
    </text>
  );
}

/** A filled checkbox with a tick, or an empty one. `x, y` is its top-left. */
export function Check({
  x,
  y,
  size = 20,
  on = true,
}: {
  x: number;
  y: number;
  size?: number;
  on?: boolean;
}) {
  if (!on) return <Box x={x} y={y} w={size} h={size} tone="muted" stroke={2} />;
  const s = size / 20;
  return (
    <g>
      <Box x={x} y={y} w={size} h={size} tone="accent" />
      <path
        d={`M${x + 4 * s} ${y + 10 * s} l${4 * s} ${4 * s} l${8 * s} ${-9 * s}`}
        className="thumb-stroke-on"
        strokeWidth={3 * s}
        fill="none"
        shapeRendering="geometricPrecision"
      />
    </g>
  );
}

/**
 * Pixel art from a grid of strings, one character per cell; `.` is empty and
 * every other character maps to a tone in `palette`. Same-colour runs merge
 * into one rect, so a sprite stays a few dozen elements.
 */
export function Pixels({
  rows,
  x,
  y,
  cell,
  palette,
}: {
  rows: readonly string[];
  x: number;
  y: number;
  cell: number;
  palette: Record<string, Tone | string>;
}) {
  const rects: ReactNode[] = [];
  rows.forEach((row, j) => {
    let i = 0;
    while (i < row.length) {
      const ch = row.charAt(i);
      let end = i;
      while (row[end + 1] === ch) end++;
      const tone = palette[ch];
      if (tone) {
        const left = x + i * cell;
        const top = y + j * cell;
        rects.push(
          <Box
            key={`${left},${top}`}
            x={left}
            y={top}
            w={(end - i + 1) * cell}
            h={cell}
            tone={tone}
          />,
        );
      }
      i = end + 1;
    }
  });
  return <g>{rects}</g>;
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/**
 * An ordered-dither (4×4 Bayer) fill as a `<pattern>`: `level` of 16 cells lit,
 * so 4 is a light haze and 16 is solid. Put it in `<defs>` and fill with
 * `url(#id)`. Ids are page-global: prefix them with the row's slug.
 */
export function Dither({
  id,
  level,
  cell = 4,
  tone = "accent",
}: {
  id: string;
  level: number;
  cell?: number;
  tone?: Tone | string;
}) {
  const lit = BAYER.flatMap((row, y) =>
    row.flatMap((t, x): [number, number][] => (t < level ? [[x, y]] : [])),
  );
  return (
    <pattern id={id} width={cell * 4} height={cell * 4} patternUnits="userSpaceOnUse">
      {lit.map(([x, y]) => (
        <Box key={`${x}-${y}`} x={x * cell} y={y * cell} w={cell} h={cell} tone={tone} />
      ))}
    </pattern>
  );
}

/**
 * A sine ridge across the frame, snapped to `snap`. It closes outside the
 * frame, so a stroke on it only draws the crest.
 */
export function ridge(base: number, amp: number, waves: number, phase: number, snap = 4) {
  let d = `M-8 ${H + 8} L-8 ${base}`;
  for (let x = 0; x <= W; x += snap) {
    const y = base + amp * Math.sin((x / W) * Math.PI * waves + phase);
    d += ` L${x} ${Math.round(y / snap) * snap}`;
  }
  return `${d} L${W + 8} ${base} L${W + 8} ${H + 8} Z`;
}

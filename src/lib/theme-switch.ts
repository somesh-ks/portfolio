import { flushSync } from "react-dom";

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_LABELS: Record<Theme, string> = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
};

const CELL = 16; // px per pixel square
const WAVES = 18; // the squares switch off in this many waves

/** Builds the pixel dissolve as a stylesheet for the old snapshot. The viewport
 * is cut into CELL squares; each lands in a wave by its distance from `origin`
 * plus a little jitter, so the edge reads pixelated, not as a clean circle. Each
 * wave is one SVG mask layer, and a stepped animation moves the layers off in
 * turn, so the old page disappears square by square. */
function pixelStyles(origin: { x: number; y: number }): string {
  const cols = Math.ceil(innerWidth / CELL);
  const rows = Math.ceil(innerHeight / CELL);
  const ox = origin.x / CELL;
  const oy = origin.y / CELL;
  const far = Math.max(
    Math.hypot(ox, oy),
    Math.hypot(cols - ox, oy),
    Math.hypot(ox, rows - oy),
    Math.hypot(cols - ox, rows - oy),
  );
  const waves: string[] = Array.from({ length: WAVES }, () => "");
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const t = (Math.hypot(x + 0.5 - ox, y + 0.5 - oy) / far) * 0.75 + Math.random() * 0.25;
      waves[Math.min(WAVES - 1, Math.floor(t * WAVES))] += `M${x} ${y}h1v1h-1z`;
    }
  }
  const layers = waves.map((d) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${rows}" width="${cols * CELL}" height="${rows * CELL}" shape-rendering="crispEdges"><path d="${d}"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  });
  const at = (gone: number) => layers.map((_, i) => (i < gone ? "-200vw 0" : "0 0")).join(",");
  const frames = layers
    .map((_, k) => `${((k / WAVES) * 100).toFixed(2)}%{mask-position:${at(k)}}`)
    .join("");
  return `::view-transition-old(root){mask-image:${layers.join(",")};mask-position:${at(0)}}
@keyframes theme-pixels{${frames}100%{mask-position:${at(WAVES)}}}`;
}

/** Switches theme through a view transition: the old page dissolves away in
 * pixel squares, starting at the click point (`origin`), or the bottom centre.
 * next-themes writes `data-theme` in an effect, and flushSync runs that effect
 * before the snapshot is taken. No visible change, no API, reduced motion or a
 * hidden tab: switch at once (`disableTransitionOnChange` still stops the per-element smear). */
export function switchTheme(
  setTheme: (theme: Theme) => void,
  next: Theme,
  origin?: { x: number; y: number },
) {
  // System can resolve to the theme already showing: then nothing should move.
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = next === "system" ? (dark ? "dark" : "light") : next;
  const instant =
    resolved === document.documentElement.dataset.theme ||
    !document.startViewTransition ||
    document.hidden ||
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (instant) return setTheme(next);
  const style = document.createElement("style");
  style.textContent = pixelStyles(origin ?? { x: innerWidth / 2, y: innerHeight });
  document.head.append(style);
  const transition = document.startViewTransition(() => flushSync(() => setTheme(next)));
  transition.finished.catch(() => {}).finally(() => style.remove());
}

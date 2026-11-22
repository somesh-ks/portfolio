import { flushSync } from "react-dom";

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_LABELS: Record<Theme, string> = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
};

/** Crossfades the whole page into the new theme with a view transition.
 * next-themes writes `data-theme` in an effect, and flushSync runs that effect
 * before the snapshot is taken. No visible change, no API, reduced motion or a
 * hidden tab: switch at once (`disableTransitionOnChange` still stops the per-element smear). */
export function switchTheme(setTheme: (theme: Theme) => void, next: Theme) {
  // System can resolve to the theme already showing: then nothing should move.
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = next === "system" ? (dark ? "dark" : "light") : next;
  const instant =
    resolved === document.documentElement.dataset.theme ||
    !document.startViewTransition ||
    document.hidden ||
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (instant) return setTheme(next);
  document.startViewTransition(() => flushSync(() => setTheme(next))).finished.catch(() => {});
}

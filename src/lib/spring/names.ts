/**
 * How a token is written in the visitor's stack. CSS reads the variable;
 * Tailwind v4 gets the utility that theme.css makes, or the (--var)
 * shorthand where Tailwind has no namespace for it (durations).
 */
import type { Styling } from "./stack";

/** A CSS variable as the stack writes it: `--text-h1` is `var(--text-h1)` or `text-h1`. */
export function tokenRef(v: string, styling: Styling): string {
  if (styling === "css") return `var(${v})`;
  if (v.startsWith("--duration-")) return `duration-(${v})`;
  const m = /^--(text|radius|ease|space)-(.+)$/.exec(v);
  if (!m) return `(${v})`;
  const [, kind, key] = m;
  // theme.css sets --spacing: 4px, so --space-4 (16px) is the 4 in p-4.
  if (kind === "space") return `p-${key!.replace("-", ".")}`;
  if (kind === "radius") return `rounded-${key}`;
  return `${kind}-${key}`;
}

/** The name shown in the UI: the variable for CSS, the utility for Tailwind. */
export const tokenName = (v: string, styling: Styling) =>
  styling === "css" ? v : tokenRef(v, styling);

/** What Copy puts on the clipboard for one type role. */
export function typeSnippet(role: string, styling: Styling): string {
  if (styling === "tailwind") return `text-${role}`;
  const v = `--text-${role}`;
  return [
    `font-size: var(${v});`,
    `line-height: var(${v}--line-height);`,
    `letter-spacing: var(${v}--letter-spacing);`,
    `font-weight: var(${v}--font-weight);`,
  ].join("\n");
}

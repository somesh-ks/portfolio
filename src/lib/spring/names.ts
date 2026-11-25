/**
 * The token formats Spring writes, and how each one names a token. The
 * format picker sets the stack: shadcn/ui is Tailwind plus shadcn's names.
 */
import type { Styling } from "./stack";
import type { SystemInput } from "./system";

export type Format = "css" | "tailwind" | "shadcn" | "dtcg";
export const FORMATS: readonly Format[] = ["css", "tailwind", "shadcn", "dtcg"];
export const FORMAT_LABEL: Record<Format, string> = {
  css: "CSS variables",
  tailwind: "Tailwind v4",
  shadcn: "shadcn/ui",
  dtcg: "DTCG JSON",
};

export const formatOf = (stack: SystemInput["stack"]): Format =>
  stack.styling === "tailwind" && stack.components === "shadcn" ? "shadcn" : stack.styling;

export function withFormat(stack: SystemInput["stack"], f: Format): SystemInput["stack"] {
  const styling: Styling = f === "shadcn" ? "tailwind" : f;
  const components =
    f === "shadcn" ? "shadcn" : stack.components === "shadcn" ? undefined : stack.components;
  return { ...stack, styling, components };
}

/** A type role's token as the format writes it: `--text-h1`, `text-h1`, `typography.h1`. */
export function typeName(role: string, f: Format): string {
  if (f === "css") return `--text-${role}`;
  if (f === "dtcg") return `typography.${role}`;
  return `text-${role}`;
}

/** What Copy puts on the clipboard for one type role. */
export function typeSnippet(role: string, f: Format): string {
  if (f === "tailwind" || f === "shadcn") return `text-${role}`;
  if (f === "dtcg") return `{typography.${role}}`;
  const v = `--text-${role}`;
  return [
    `font-size: var(${v});`,
    `line-height: var(${v}--line-height);`,
    `letter-spacing: var(${v}--letter-spacing);`,
    `font-weight: var(${v}--font-weight);`,
  ].join("\n");
}

/**
 * Token gate:
 * 1. Generated CSS (tokens.css, fluid.css) matches a fresh build (no drift).
 * 2. Every text/surface pair meets WCAG 2.2 AA in light and dark.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { wcagContrast, type Oklch } from "culori";
import { buildTokens } from "./tokens.ts";

type Mode = "light" | "dark";
interface ColorValue {
  colorSpace: "oklch";
  components: [number, number, number];
  alpha?: number;
}
interface TokenNode {
  $value?: unknown;
  $extensions?: { mode?: Record<Mode, unknown> };
  [key: string]: unknown;
}

const GENERATED = ["src/styles/tokens.css", "src/styles/fluid.css"];

function load(path: string): TokenNode {
  return JSON.parse(readFileSync(path, "utf8")) as TokenNode;
}
const tree: TokenNode = {
  ...load("tokens/primitives.json"),
  ...load("tokens/semantic.json"),
};

function lookup(path: string): TokenNode {
  let node: unknown = tree;
  for (const part of path.split(".")) node = (node as Record<string, unknown>)?.[part];
  if (!node || typeof node !== "object") throw new Error(`Unknown token ${path}`);
  return node as TokenNode;
}

export function resolveColor(path: string, mode: Mode): ColorValue {
  const node = lookup(path);
  const raw = node.$extensions?.mode?.[mode] ?? node.$value;
  if (typeof raw === "string") return resolveColor(raw.slice(1, -1), mode);
  return raw as ColorValue;
}

function toCulori(color: ColorValue): Oklch {
  const [l, c, h] = color.components;
  return { mode: "oklch", l, c, h, alpha: color.alpha ?? 1 };
}

/** Composite a translucent colour over an opaque one in OKLab-ish space is
 * not exact; contrast pairs here are opaque, translucent ones are skipped. */
function contrast(fg: string, bg: string, mode: Mode): number {
  return wcagContrast(toCulori(resolveColor(fg, mode)), toCulori(resolveColor(bg, mode)));
}

const SURFACES = ["surface.canvas", "surface.raised", "surface.sunken", "surface.hover"];
const TEXT = ["text.primary", "text.secondary", "text.accent", "text.success", "text.danger"];
const PAIRS: { fg: string; bg: string; min: number }[] = [
  ...SURFACES.flatMap((bg) => TEXT.map((fg) => ({ fg, bg, min: 4.5 }))),
  { fg: "accent.on-solid", bg: "accent.solid", min: 4.5 },
  { fg: "text.inverse", bg: "surface.inverse", min: 4.5 },
  // Non-text UI (WCAG 1.4.11): focus ring and strong borders.
  ...SURFACES.map((bg) => ({ fg: "focus.ring", bg, min: 3 })),
  { fg: "border.strong", bg: "surface.canvas", min: 3 },
];

export function contrastFailures(): string[] {
  const failures: string[] = [];
  for (const mode of ["light", "dark"] as const) {
    for (const { fg, bg, min } of PAIRS) {
      const ratio = contrast(fg, bg, mode);
      if (ratio < min) failures.push(`${mode}: ${fg} on ${bg} = ${ratio.toFixed(2)} (< ${min})`);
    }
  }
  return failures;
}

function driftFailures(): string[] {
  const before = GENERATED.map((path) => readFileSync(path, "utf8"));
  buildTokens();
  const drifted = GENERATED.filter((path, index) => readFileSync(path, "utf8") !== before[index]);
  // Leave the working tree as it was so the check has no side effects.
  GENERATED.forEach((path, index) => writeFileSync(path, before[index] ?? ""));
  return drifted.map((path) => `${path} is stale: run \`bun run tokens\``);
}

/** Component colors may only alias the semantic tier, so a theme stays one file.
 * Radius and space alias the primitive scales directly; themes don't change them. */
function tierFailures(): string[] {
  const semanticGroups = new Set(Object.keys(load("tokens/semantic.json")));
  const failures: string[] = [];
  const visit = (node: Record<string, unknown>, path: string) => {
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$") || !child || typeof child !== "object") continue;
      const { $value: value, $type: type } = child as { $value?: unknown; $type?: string };
      const id = path ? `${path}.${key}` : key;
      if (value === undefined) visit(child as Record<string, unknown>, id);
      else if (type !== "color") continue;
      else if (
        typeof value !== "string" ||
        !semanticGroups.has(value.slice(1).split(".")[0] ?? "") ||
        !value.startsWith("{")
      )
        failures.push(`component token ${id} must alias a semantic token, got ${String(value)}`);
    }
  };
  visit(load("tokens/component.json") as Record<string, unknown>, "");
  return failures;
}

if (import.meta.main) {
  const failures = [...driftFailures(), ...contrastFailures(), ...tierFailures()];
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.warn(`tokens: ${PAIRS.length * 2} contrast pairs pass, generated CSS is current`);
}

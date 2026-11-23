/**
 * The whole system from a small input. Everything downstream (preview,
 * exports, audit fixes, the share link) goes through buildSystem, so the
 * input is the only state the app keeps.
 */
import {
  buildNeutral,
  buildScale,
  contrast,
  parseColor,
  swatch,
  type Mode,
  type Scale,
  type Step,
} from "./color";
import {
  buildMotion,
  buildShadows,
  buildShape,
  buildSpace,
  type Motion,
  type Shadow,
  type Shape,
  type Space,
} from "./scales";
import { recommend, type StackAnswers, type StackPicks } from "./stack";
import { buildType, type TypeInput, type TypeSystem } from "./type";

type Label = "auto" | "white" | "ink";

export interface SystemInput {
  v: 1;
  name: string;
  accent: { hue: number; chroma: number; solidL?: number; label?: Label };
  /** 0 = pure gray, 1 = clearly tinted. */
  neutralTint: number;
  /** Hue the neutrals lean toward. Defaults to the accent hue; set it for warm or cool grays. */
  neutralHue?: number;
  type: TypeInput;
  /** 0 compact, 0.5 default, 1 comfortable. */
  density: number;
  /** 0 square, 1 very round. */
  roundness: number;
  /** 0 calm, 1 lively. */
  motion: number;
  stack: StackAnswers & Partial<Omit<StackPicks, "styling">>;
}

export const DEFAULT_INPUT: SystemInput = {
  v: 1,
  name: "Untitled",
  accent: { hue: 264, chroma: 0.2 },
  neutralTint: 0.3,
  type: {
    body: "Inter",
    heading: "Inter",
    mono: "JetBrains Mono",
    base: 16,
    ratio: 1.25,
    headingWeight: 600,
    fluid: true,
  },
  density: 0.5,
  roundness: 0.5,
  motion: 0.4,
  stack: { building: "app", ownership: "own", styling: "tailwind" },
};

export function inputFromSeed(seed: string, name = "Untitled"): SystemInput {
  const c = parseColor(seed);
  if (!c) return { ...DEFAULT_INPUT, name };
  const neutralish = c.c < 0.03;
  return {
    ...DEFAULT_INPUT,
    name,
    accent: {
      hue: Math.round(c.h || 0),
      chroma: neutralish ? 0.02 : Math.min(0.3, Math.max(0.06, c.c)),
      solidL: Math.min(0.9, Math.max(0.35, c.l)),
    },
  };
}

const STATUS_HUES = { danger: 25, warning: 70, success: 150, info: 245 } as const;
type StatusName = keyof typeof STATUS_HUES;

/** Hues each status may move within and still read as itself. */
const STATUS_RANGE: Record<StatusName, [number, number]> = {
  danger: [-5, 40],
  warning: [55, 85],
  success: [130, 165],
  info: [225, 265],
};
const hueGap = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

/**
 * A status hue that stays clear of the accent: a red brand still gets a
 * danger color you can tell apart from it, a green brand a distinct success.
 */
function statusHue(name: StatusName, accentHue: number, accentChroma: number): number {
  const base = STATUS_HUES[name];
  if (accentChroma < 0.05 || hueGap(base, accentHue) >= 25) return base;
  const [lo, hi] = STATUS_RANGE[name];
  const best = hueGap(lo, accentHue) > hueGap(hi, accentHue) ? lo : hi;
  return (best + 360) % 360;
}
export type ScaleName = "accent" | "neutral" | StatusName;

interface Role {
  name: string;
  hex: string;
  css: string;
  /** e.g. "neutral.12" or "on accent.9" */
  from: string;
  job: string;
}

interface Check {
  fg: string;
  bg: string;
  ratio: number;
  min: number;
  pass: boolean;
  /** advisory checks are shown but don't fail the system */
  advisory?: boolean;
  why: string;
}

export interface System {
  input: SystemInput;
  scales: Record<ScaleName, Scale>;
  roles: Record<Mode, Role[]>;
  checks: Record<Mode, Check[]>;
  adjustments: string[];
  type: TypeSystem;
  space: Space;
  shape: Shape;
  shadows: Record<Mode, Shadow>;
  motion: Motion;
  stack: StackPicks;
  stackReasons: Record<keyof StackPicks, string>;
}

const get = (scales: Record<ScaleName, Scale>, name: ScaleName, mode: Mode, step: Step) =>
  scales[name][mode][step - 1]!;

/** Move a swatch's lightness away from `against` until it meets `min`. */
function nudge(
  scales: Record<ScaleName, Scale>,
  name: ScaleName,
  mode: Mode,
  step: Step,
  against: string[],
  min: number,
): boolean {
  const s = get(scales, name, mode, step);
  const dir = mode === "light" ? -1 : 1;
  let { l } = s.oklch;
  for (let i = 0; i < 60; i++) {
    const cur = swatch(step, { ...s.oklch, l });
    if (against.every((bg) => contrast(cur.hex, bg) >= min)) {
      scales[name][mode][step - 1] = cur;
      return i > 0;
    }
    l = Math.min(1, Math.max(0, l + dir * 0.01));
  }
  return false;
}

/** How far step 9 must move in lightness for `fg` to pass 4.5:1 on it. */
function shiftNeeded(base: { l: number; c: number; h: number }, fg: string): number {
  const dir = fg === "#ffffff" ? -1 : 1;
  for (let i = 0; i <= 60; i++) {
    if (contrast(fg, swatch(9, { ...base, l: base.l + dir * i * 0.01 }).hex) >= 4.5)
      return i * 0.01;
  }
  return 1;
}

/**
 * The label on solid fills. White by default; dark ink when the brand color is
 * light enough that white would force a big shift away from it (yellows,
 * emeralds, light blues). "white" and "ink" force the choice.
 */
function solidLabel(
  scales: Record<ScaleName, Scale>,
  name: ScaleName,
  mode: Mode,
  pref: Label = "auto",
): string {
  const ink = get(scales, name, "light", 12).hex;
  if (pref === "white") return "#ffffff";
  if (pref === "ink") return ink;
  const base = get(scales, name, mode, 9).oklch;
  const w = shiftNeeded(base, "#ffffff");
  return w <= 0.1 || w <= shiftNeeded(base, ink) ? "#ffffff" : ink;
}

function fixSolid(
  scales: Record<ScaleName, Scale>,
  name: ScaleName,
  mode: Mode,
  fg: string,
): boolean {
  const dir = fg === "#ffffff" ? -1 : 1;
  let changed = false;
  for (const step of [9, 10] as Step[]) {
    const s = get(scales, name, mode, step);
    let { l } = s.oklch;
    for (let i = 0; i < 60 && contrast(fg, swatch(step, { ...s.oklch, l }).hex) < 4.5; i++)
      l += dir * 0.01;
    if (l !== s.oklch.l) {
      scales[name][mode][step - 1] = swatch(step, { ...s.oklch, l });
      changed = true;
    }
  }
  // Keep hover distinct from rest after fixing.
  const s9 = get(scales, name, mode, 9);
  const s10 = get(scales, name, mode, 10);
  if (Math.abs(s9.oklch.l - s10.oklch.l) < 0.02)
    scales[name][mode][9] = swatch(10, { ...s10.oklch, l: s9.oklch.l + dir * 0.04 });
  return changed;
}

function buildRoles(
  scales: Record<ScaleName, Scale>,
  mode: Mode,
  labels: Record<ScaleName, Record<Mode, string>>,
): Role[] {
  const r = (name: string, scale: ScaleName, step: Step, job: string): Role => {
    const s = get(scales, scale, mode, step);
    return { name, hex: s.hex, css: s.css, from: `${scale}.${step}`, job };
  };
  const on = (name: string, scale: ScaleName, job: string): Role => {
    const hex = labels[scale][mode];
    return { name, hex, css: hex, from: `on ${scale}.9`, job };
  };
  const roles: Role[] = [
    r("bg", "neutral", 1, "Page background"),
    r("bg-subtle", "neutral", 2, "Sidebars, cards, striped rows"),
    r("fill", "neutral", 3, "Inputs, secondary buttons, chips"),
    r("fill-hover", "neutral", 4, "Hovered fill"),
    r("fill-active", "neutral", 5, "Pressed or selected fill"),
    r("border-subtle", "neutral", 6, "Dividers and card edges"),
    r("border", "neutral", 7, "Input and control borders"),
    r("border-strong", "neutral", 8, "Hovered borders, emphasis"),
    r("text-muted", "neutral", 11, "Secondary text, placeholders, icons"),
    r("text", "neutral", 12, "Body and heading text"),
    r("accent", "accent", 9, "Primary action, one per view"),
    r("accent-hover", "accent", 10, "Hovered primary action"),
    on("accent-fg", "accent", "Text and icons on accent"),
    r("accent-subtle", "accent", 3, "Selected rows, soft badges"),
    r("accent-subtle-hover", "accent", 4, "Hovered soft accent"),
    r("accent-border", "accent", 7, "Borders of accent-subtle elements"),
    r("accent-text", "accent", 11, "Links and accent text on bg"),
    r("ring", "accent", 9, "Focus ring"),
  ];
  for (const s of Object.keys(STATUS_HUES) as StatusName[]) {
    roles.push(
      r(s, s, 9, `Solid ${s} fill`),
      on(`${s}-fg`, s, `Text on ${s}`),
      r(`${s}-subtle`, s, 3, `Soft ${s} background`),
      r(`${s}-text`, s, 11, `${s[0]!.toUpperCase() + s.slice(1)} text on bg`),
    );
  }
  return roles;
}

const PAIRS: Array<[fg: string, bg: string, min: number, why: string, advisory?: boolean]> = [
  ["text", "bg", 4.5, "Body text"],
  ["text", "bg-subtle", 4.5, "Text on cards and sidebars"],
  ["text", "fill", 4.5, "Text in inputs and secondary buttons"],
  ["text-muted", "bg", 4.5, "Secondary text"],
  ["text-muted", "bg-subtle", 4.5, "Secondary text on cards"],
  ["text-muted", "fill", 4.5, "Placeholders in inputs"],
  ["accent-fg", "accent", 4.5, "Primary button label"],
  ["accent-fg", "accent-hover", 4.5, "Hovered primary button label"],
  ["accent-text", "bg", 4.5, "Links"],
  ["accent-text", "accent-subtle", 4.5, "Text in soft accent badges"],
  ["ring", "bg", 3, "Focus ring is visible (WCAG 2.4.13)"],
  ["border-strong", "bg", 3, "Control edges alone identify the control (WCAG 1.4.11)", true],
  ...(Object.keys(STATUS_HUES) as StatusName[]).flatMap(
    (s): Array<[string, string, number, string]> => [
      [`${s}-text`, "bg", 4.5, `${s} messages`],
      [`${s}-fg`, s, 4.5, `Label on solid ${s}`],
    ],
  ),
];

function runChecks(roles: Role[]): Check[] {
  const by = Object.fromEntries(roles.map((r) => [r.name, r]));
  return PAIRS.map(([fg, bg, min, why, advisory]) => {
    const ratio = contrast(by[fg]!.hex, by[bg]!.hex);
    return { fg, bg, ratio: Math.round(ratio * 100) / 100, min, pass: ratio >= min, advisory, why };
  });
}

export function buildSystem(input: SystemInput): System {
  const scales: Record<ScaleName, Scale> = {
    accent: buildScale(input.accent),
    neutral: buildNeutral(input.neutralHue ?? input.accent.hue, input.neutralTint),
    danger: buildScale({
      hue: statusHue("danger", input.accent.hue, input.accent.chroma),
      chroma: 0.2,
      solidL: 0.55,
    }),
    warning: buildScale({
      hue: statusHue("warning", input.accent.hue, input.accent.chroma),
      chroma: 0.16,
      solidL: 0.82,
    }),
    success: buildScale({
      hue: statusHue("success", input.accent.hue, input.accent.chroma),
      chroma: 0.15,
      solidL: 0.52,
    }),
    info: buildScale({
      hue: statusHue("info", input.accent.hue, input.accent.chroma),
      chroma: 0.15,
      solidL: 0.52,
    }),
  };

  // Fix contrast at the source, so every export inherits passing pairs.
  const adjustments: string[] = [];
  const labels = Object.fromEntries(
    Object.keys(scales).map((k) => [k, { light: "#ffffff", dark: "#ffffff" }]),
  ) as Record<ScaleName, Record<Mode, string>>;
  for (const mode of ["light", "dark"] as Mode[]) {
    const n = (s: Step) => get(scales, "neutral", mode, s).hex;
    if (nudge(scales, "neutral", mode, 11, [n(1), n(2), n(3)], 4.5))
      adjustments.push(`neutral.11 (${mode}) adjusted so secondary text passes 4.5:1 on inputs.`);
    if (nudge(scales, "neutral", mode, 12, [n(1), n(2), n(3)], 7))
      adjustments.push(`neutral.12 (${mode}) adjusted to reach 7:1.`);
    for (const name of ["accent", ...Object.keys(STATUS_HUES)] as ScaleName[]) {
      labels[name][mode] = solidLabel(
        scales,
        name,
        mode,
        name === "accent" ? (input.accent.label ?? "auto") : "auto",
      );
      const fixed = fixSolid(scales, name, mode, labels[name][mode]);
      if (fixed && name === "accent")
        adjustments.push(`${name}.9 (${mode}) shifted in lightness so its label passes 4.5:1.`);
      const subtle = get(scales, name, mode, 3).hex;
      if (nudge(scales, name, mode, 11, [n(1), n(2), subtle], 4.5) && name === "accent")
        adjustments.push(`${name}.11 (${mode}) adjusted to pass 4.5:1 as text.`);
      if (name === "accent" && contrast(get(scales, name, mode, 9).hex, n(1)) < 3)
        adjustments.push(
          `accent.9 (${mode}) is under 3:1 on bg; the focus ring uses accent.11 instead.`,
        );
    }
  }

  const roles = {
    light: buildRoles(scales, "light", labels),
    dark: buildRoles(scales, "dark", labels),
  };
  for (const mode of ["light", "dark"] as Mode[]) {
    const ring = roles[mode].find((r) => r.name === "ring")!;
    if (contrast(ring.hex, roles[mode][0]!.hex) < 3) {
      const alt = get(scales, "accent", mode, 11);
      Object.assign(ring, { hex: alt.hex, css: alt.css, from: "accent.11" });
    }
  }
  const rec = recommend(input.stack);
  return {
    input,
    scales,
    roles,
    checks: { light: runChecks(roles.light), dark: runChecks(roles.dark) },
    adjustments,
    type: buildType(input.type),
    space: buildSpace(input.density),
    shape: buildShape(input.roundness),
    shadows: {
      light: buildShadows(input.neutralHue ?? input.accent.hue, "light"),
      dark: buildShadows(input.neutralHue ?? input.accent.hue, "dark"),
    },
    motion: buildMotion(input.motion),
    stack: {
      components: input.stack.components ?? rec.components,
      icons: input.stack.icons ?? rec.icons,
      styling: input.stack.styling,
    },
    stackReasons: rec.reasons,
  };
}

export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-") || "design-system"
  );
}

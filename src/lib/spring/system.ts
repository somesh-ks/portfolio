/**
 * The whole system from a small input. Everything downstream (preview,
 * exports, audit fixes, the share link) goes through buildSystem, so the
 * input is the only state the app keeps.
 */
import {
  buildCharts,
  CHART_SUGGESTED,
  suggest,
  type Charts,
  type DataColor,
  type Ramps,
} from "./charts";
import {
  buildNeutral,
  buildScale,
  contrast,
  freshName,
  parseColor,
  swatch,
  type BuiltScale,
  type Curve,
  type Mode,
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
import { apcaContrast } from "./colormath";
import { recommend, type StackAnswers, type StackPicks } from "./stack";
import { buildType, type TypeInput, type TypeSystem } from "./type";

type Label = "auto" | "white" | "ink";
/** The contrast bar every pair is held to. */
export type ContrastTarget = "aa" | "aaa" | "apca";

export interface SystemInput {
  v: 1;
  name: string;
  primary: { hue: number; chroma: number; solidL?: number; label?: Label };
  /** 0 = pure gray, 1 = clearly tinted. */
  neutralTint: number;
  /** Hue the neutrals lean toward. Defaults to the primary hue; set it for warm or cool grays. */
  neutralHue?: number;
  /** The palette's lightness curve and hue shift; DEFAULT_CURVE when absent. */
  curve?: Curve;
  /** Status colors the user set, as hex; the rest stay clear of the primary on their own. */
  status?: Partial<Record<StatusName, string>>;
  /** Extra color strips the user added: a name and a seed hex each. */
  colors?: { name: string; hex: string }[];
  /** "aa" when absent. */
  contrast?: ContrastTarget;
  /** Data colors in chart order. Absent: six suggested from the primary. Empty: none. */
  data?: DataColor[];
  /** Which data colors the sequential and diverging ramps use, by position. */
  ramps?: Ramps;
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
  primary: { hue: 264, chroma: 0.2 },
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

const r4 = (n: number) => Math.round(n * 10000) / 10000;

export function inputFromSeed(seed: string, name = "Untitled"): SystemInput {
  const c = parseColor(seed);
  if (!c) return { ...DEFAULT_INPUT, name };
  const neutralish = c.c < 0.03;
  return {
    ...DEFAULT_INPUT,
    name,
    primary: {
      hue: Math.round((c.h || 0) * 10) / 10,
      // Rounded as the share link stores them, so a link rebuilds the same palette.
      chroma: r4(neutralish ? 0.02 : Math.min(0.3, Math.max(0.06, c.c))),
      solidL: r4(Math.min(0.9, Math.max(0.35, c.l))),
    },
  };
}

const STATUS_HUES = { danger: 25, warning: 70, success: 150, info: 245 } as const;
export type StatusName = keyof typeof STATUS_HUES;

/** Hues each status may move within and still read as itself. */
export const STATUS_RANGE: Record<StatusName, [number, number]> = {
  danger: [-5, 40],
  warning: [55, 85],
  success: [130, 165],
  info: [225, 265],
};
const hueGap = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

/**
 * A status hue that stays clear of the primary: a red brand still gets a
 * danger color you can tell apart from it, a green brand a distinct success.
 */
function statusHue(
  name: StatusName,
  primaryHue: number,
  primaryChroma: number,
  set?: number,
): number {
  const [lo0, hi0] = STATUS_RANGE[name];
  if (set !== undefined) return (Math.min(hi0, Math.max(lo0, set)) + 360) % 360;
  const base = STATUS_HUES[name];
  if (primaryChroma < 0.05 || hueGap(base, primaryHue) >= 25) return base;
  const [lo, hi] = STATUS_RANGE[name];
  const best = hueGap(lo, primaryHue) > hueGap(hi, primaryHue) ? lo : hi;
  return (best + 360) % 360;
}
export type ScaleName = "primary" | "neutral" | StatusName;

/** Names a custom strip can't take: the built-in scales and the role words. */
const RESERVED = new Set([
  "primary",
  "neutral",
  ...Object.keys(STATUS_HUES),
  "bg",
  "fill",
  "border",
  "text",
  "ring",
  "shadow",
  "color",
]);
/** A custom strip's token name: its slug, kept clear of built-ins and of other strips. */
function stripKeys(colors: { name: string }[]): string[] {
  const used = new Set<string>();
  return colors.map((c, i) => {
    let k = slug(c.name) === "design-system" ? `color-${i + 1}` : slug(c.name);
    if (RESERVED.has(k)) k = `${k}-custom`;
    let n = 2;
    const base = k;
    while (used.has(k)) k = `${base}-${n++}`;
    used.add(k);
    return k;
  });
}

/** How many strips a person can add. */
export const MAX_STRIPS = 6;

/** A strip the user added, built like the primary. */
interface CustomStrip {
  name: string;
  key: string;
  hex: string;
}

interface Role {
  name: string;
  hex: string;
  css: string;
  /** e.g. "neutral.12" or "on primary.9" */
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
  /** Built-in scales, plus each custom strip under its key. */
  scales: Record<ScaleName, BuiltScale> & Partial<Record<string, BuiltScale>>;
  /** Custom strips in the order they were added. */
  custom: CustomStrip[];
  /** The step each scale's solid fill uses, per mode: the brand step, or the nearest one its label passes on. */
  solid: Record<ScaleName, Record<Mode, Step>> & Partial<Record<string, Record<Mode, Step>>>;
  roles: Record<Mode, Role[]>;
  checks: Record<Mode, Check[]>;
  adjustments: string[];
  type: TypeSystem;
  space: Space;
  shape: Shape;
  shadows: Record<Mode, Shadow>;
  motion: Motion;
  /** Data colors in chart order (the suggested ones when the input has none), built like strips. */
  data: CustomStrip[];
  /** Marks, ramps and checks for the data colors. */
  charts: Charts;
  stack: StackPicks;
  stackReasons: Record<keyof StackPicks, string>;
}

/**
 * How a pair is scored and the bar it must clear. A pair names its job and the
 * target sets the number: WCAG ratios for AA and AAA, Lc levels for APCA (75 for
 * body text, 60 for labels and short text, 45 for UI edges).
 */
type Level = "ui" | "text" | "body" | "strong";
interface Meter {
  score: (fg: string, bg: string) => number;
  bar: (level: Level) => number;
  unit: string;
}
const BARS: Record<ContrastTarget, Record<Level, number>> = {
  aa: { ui: 3, text: 4.5, body: 4.5, strong: 7 },
  aaa: { ui: 3, text: 7, body: 7, strong: 7 },
  apca: { ui: 45, text: 60, body: 75, strong: 75 },
};
export const CONTRAST_LABEL: Record<ContrastTarget, string> = {
  aa: "WCAG 2.2 AA",
  aaa: "WCAG 2.2 AAA",
  apca: "APCA",
};
function meter(target: ContrastTarget): Meter {
  return {
    score: target === "apca" ? apcaContrast : contrast,
    bar: (level) => BARS[target][level],
    unit: target === "apca" ? "Lc" : ":1",
  };
}
const said = (m: Meter, level: Level) =>
  m.unit === "Lc" ? `Lc ${m.bar(level)}` : `${m.bar(level)}:1`;

type Scales = Partial<Record<string, BuiltScale>>;
const get = (scales: Scales, name: string, mode: Mode, step: Step) =>
  scales[name]![mode][step - 1]!;

/** Move a swatch's lightness away from `against` until it meets `min`. */
function nudge(
  scales: Scales,
  name: string,
  mode: Mode,
  step: Step,
  against: string[],
  min: Level,
  m: Meter,
): boolean {
  const s = get(scales, name, mode, step);
  const dir = mode === "light" ? -1 : 1;
  let { l } = s.oklch;
  for (let i = 0; i < 60; i++) {
    const cur = swatch(step, { ...s.oklch, l });
    if (against.every((bg) => m.score(cur.hex, bg) >= m.bar(min))) {
      scales[name]![mode][step - 1] = cur;
      return i > 0;
    }
    l = Math.min(1, Math.max(0, l + dir * 0.01));
  }
  return false;
}

/** Steps toward more contrast with `fg`: darker for a white label, lighter for ink. */
const towardContrast = (fg: string, mode: Mode) =>
  (fg === "#ffffff") === (mode === "light") ? 1 : -1;

/** Steps the solid must move along the scale before `fg` clears the label bar on it and on its hover. */
function stepsNeeded(scale: BuiltScale, mode: Mode, from: Step, fg: string, m: Meter): number {
  const dir = towardContrast(fg, mode);
  for (let n = 0; n < 12; n++) {
    const s = from + dir * n;
    const h = s + dir;
    if (h < 1 || h > 12) return 99;
    if (
      m.score(fg, scale[mode][s - 1]!.hex) >= m.bar("text") &&
      m.score(fg, scale[mode][h - 1]!.hex) >= m.bar("text")
    )
      return n;
  }
  return 99;
}

/**
 * The label on solid fills. White by default; dark ink when the brand color is
 * light enough that white would push the solid far from it (yellows, emeralds,
 * light blues). "white" and "ink" force the choice.
 */
function solidLabel(scale: BuiltScale, mode: Mode, m: Meter, pref: Label = "auto"): string {
  const ink = scale.light[11]!.hex;
  if (pref === "white") return "#ffffff";
  if (pref === "ink") return ink;
  const k = scale.anchor[mode];
  const w = stepsNeeded(scale, mode, k, "#ffffff", m);
  return w === 0 || w <= stepsNeeded(scale, mode, k, ink, m) ? "#ffffff" : ink;
}

/** The solid step: the brand step if its label passes, else the nearest step along the curve that does. */
function solidStep(scale: BuiltScale, mode: Mode, fg: string, m: Meter): Step {
  const n = stepsNeeded(scale, mode, scale.anchor[mode], fg, m);
  const k = scale.anchor[mode] + towardContrast(fg, mode) * (n === 99 ? 0 : n);
  return Math.min(11, Math.max(2, k)) as Step;
}

function buildRoles(
  scales: Scales,
  mode: Mode,
  labels: Partial<Record<string, Record<Mode, string>>>,
  solid: Partial<Record<string, Record<Mode, Step>>>,
  custom: CustomStrip[],
): Role[] {
  const at = (scale: string) => solid[scale]![mode];
  const hover = (scale: string) => (at(scale) + towardContrast(labels[scale]![mode], mode)) as Step;
  const r = (name: string, scale: string, step: Step, job: string): Role => {
    const s = get(scales, scale, mode, step);
    return { name, hex: s.hex, css: s.css, from: `${scale}.${step}`, job };
  };
  const on = (name: string, scale: string, job: string): Role => {
    const hex = labels[scale]![mode];
    return { name, hex, css: hex, from: `on ${scale}.${at(scale)}`, job };
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
    r("primary", "primary", at("primary"), "Primary action, one per view"),
    r("primary-hover", "primary", hover("primary"), "Hovered primary action"),
    on("primary-fg", "primary", "Text and icons on primary"),
    r("primary-subtle", "primary", 3, "Selected rows, soft badges"),
    r("primary-subtle-hover", "primary", 4, "Hovered soft primary"),
    r("primary-border", "primary", 7, "Borders of primary-subtle elements"),
    r("primary-text", "primary", 11, "Links and primary text on bg"),
    r("ring", "primary", at("primary"), "Focus ring"),
  ];
  for (const s of Object.keys(STATUS_HUES) as StatusName[]) {
    roles.push(
      r(s, s, at(s), `Solid ${s} fill`),
      on(`${s}-fg`, s, `Text on ${s}`),
      r(`${s}-subtle`, s, 3, `Soft ${s} background`),
      r(`${s}-text`, s, 11, `${s[0]!.toUpperCase() + s.slice(1)} text on bg`),
    );
  }
  for (const { key: k, name } of custom)
    roles.push(
      r(k, k, at(k), `Solid ${name} fill`),
      on(`${k}-fg`, k, `Text on ${name}`),
      r(`${k}-subtle`, k, 3, `Soft ${name} background`),
      r(`${k}-text`, k, 11, `${name} text on bg`),
    );
  return roles;
}

const BASE_PAIRS: Array<[fg: string, bg: string, min: Level, why: string, advisory?: boolean]> = [
  ["text", "bg", "body", "Body text"],
  ["text", "bg-subtle", "body", "Text on cards and sidebars"],
  ["text", "fill", "text", "Text in inputs and secondary buttons"],
  ["text-muted", "bg", "text", "Secondary text"],
  ["text-muted", "bg-subtle", "text", "Secondary text on cards"],
  ["text-muted", "fill", "text", "Placeholders in inputs"],
  ["primary-fg", "primary", "text", "Primary button label"],
  ["primary-fg", "primary-hover", "text", "Hovered primary button label"],
  ["primary-text", "bg", "text", "Links"],
  ["primary-text", "primary-subtle", "text", "Text in soft primary badges"],
  ["ring", "bg", "ui", "Focus ring is visible (WCAG 2.4.13)"],
  ["border-strong", "bg", "ui", "Control edges alone identify the control (WCAG 1.4.11)", true],
  ...(Object.keys(STATUS_HUES) as StatusName[]).flatMap(
    (s): Array<[string, string, Level, string]> => [
      [`${s}-text`, "bg", "text", `${s} messages`],
      [`${s}-fg`, s, "text", `Label on solid ${s}`],
    ],
  ),
];

function runChecks(roles: Role[], m: Meter, custom: CustomStrip[]): Check[] {
  const by = Object.fromEntries(roles.map((r) => [r.name, r]));
  const pairs: typeof BASE_PAIRS = [
    ...BASE_PAIRS,
    ...custom.flatMap(({ key: k, name }): typeof BASE_PAIRS => [
      [`${k}-text`, "bg", "text", `${name} text`],
      [`${k}-fg`, k, "text", `Label on solid ${name}`],
    ]),
  ];
  return pairs.map(([fg, bg, level, why, advisory]) => {
    const ratio = m.score(by[fg]!.hex, by[bg]!.hex);
    const min = m.bar(level);
    return { fg, bg, ratio: Math.round(ratio * 100) / 100, min, pass: ratio >= min, advisory, why };
  });
}

/** Plain hue names for suggested seeds, each kept clear of the ones before it. */
function named(seeds: string[]): DataColor[] {
  const out: DataColor[] = [];
  for (const hex of seeds)
    out.push({
      name: freshName(
        parseColor(hex)!,
        out.map((c) => c.name),
      ),
      hex,
    });
  return out;
}

export function buildSystem(input: SystemInput): System {
  // Hue shift bends the brand's own strips; grays and statuses keep one hue so they stay themselves.
  const flat = input.curve ? { ...input.curve, hueShift: 0 } : undefined;
  // A muted brand gets calmer statuses; a floor keeps them recognisable.
  const calm = Math.min(1, Math.max(0.6, input.primary.chroma / 0.15));
  const status = (name: StatusName, chroma: number, solidL: number) => {
    const set = input.status?.[name] ? parseColor(input.status[name]) : null;
    return buildScale({
      hue: statusHue(name, input.primary.hue, input.primary.chroma, set?.h),
      chroma: set ? Math.min(0.3, Math.max(0.06, set.c)) : chroma * calm,
      solidL,
      curve: flat,
    });
  };
  const neutral = buildNeutral(input.neutralHue ?? input.primary.hue, input.neutralTint, flat);
  const pages = { light: neutral.light[0]!.hex, dark: neutral.dark[0]!.hex };
  const dataIn = input.data ?? named(suggest(input.primary, CHART_SUGGESTED, pages, input.curve));
  const colorsIn = input.colors ?? [];
  // UI and data strips share one token namespace, so "blue" in both becomes blue and blue-2.
  const keys = stripKeys([...colorsIn, ...dataIn]);
  const strip = (c: DataColor, i: number): CustomStrip => ({
    name: c.name,
    hex: c.hex,
    key: keys[i]!,
  });
  const custom = colorsIn.map(strip);
  const data = dataIn.map((c, i) => strip(c, colorsIn.length + i));
  const scales: System["scales"] = {
    primary: buildScale({ ...input.primary, curve: input.curve }),
    neutral,
    danger: status("danger", 0.2, 0.55),
    warning: status("warning", 0.16, 0.82),
    success: status("success", 0.15, 0.52),
    info: status("info", 0.15, 0.52),
  };
  for (const c of custom) {
    const seed = parseColor(c.hex);
    if (seed)
      scales[c.key] = buildScale({
        hue: seed.h,
        chroma: seed.c,
        solidL: Math.min(0.9, Math.max(0.35, seed.l)),
        curve: input.curve,
      });
  }
  const strips = custom.filter((c) => scales[c.key]);
  for (const c of data) {
    const seed = parseColor(c.hex)!;
    scales[c.key] = buildScale({
      hue: seed.h,
      chroma: seed.c,
      solidL: Math.min(0.9, Math.max(0.35, seed.l)),
      curve: input.curve,
    });
  }

  // Fix contrast at the source, so every export inherits passing pairs.
  const m = meter(input.contrast ?? "aa");
  const adjustments: string[] = [];
  const labels = Object.fromEntries(
    Object.keys(scales).map((k) => [k, { light: "#ffffff", dark: "#ffffff" }]),
  ) as Record<string, Record<Mode, string>>;
  const solid = Object.fromEntries(
    Object.keys(scales).map((k) => [k, { light: 9, dark: 9 }]),
  ) as System["solid"];
  for (const mode of ["light", "dark"] as Mode[]) {
    const n = (s: Step) => get(scales, "neutral", mode, s).hex;
    if (nudge(scales, "neutral", mode, 11, [n(1), n(2), n(3)], "text", m))
      adjustments.push(
        `neutral.11 (${mode}) adjusted so secondary text reaches ${said(m, "text")} on inputs.`,
      );
    if (nudge(scales, "neutral", mode, 12, [n(1), n(2), n(3)], "strong", m))
      adjustments.push(`neutral.12 (${mode}) adjusted to reach ${said(m, "strong")}.`);
    for (const name of ["primary", ...Object.keys(STATUS_HUES), ...strips.map((c) => c.key)]) {
      const scale = scales[name]!;
      labels[name]![mode] = solidLabel(
        scale,
        mode,
        m,
        name === "primary" ? (input.primary.label ?? "auto") : "auto",
      );
      const step = solidStep(scale, mode, labels[name]![mode], m);
      solid[name] = { ...solid[name]!, [mode]: step };
      if (name === "primary" && step !== scale.anchor[mode])
        adjustments.push(
          `Brand color sits on step ${scale.anchor[mode]} (${mode}); buttons use step ${step} so their label reaches ${said(m, "text")}.`,
        );
      const subtle = get(scales, name, mode, 3).hex;
      if (nudge(scales, name, mode, 11, [n(1), n(2), subtle], "text", m) && name === "primary")
        adjustments.push(`${name}.11 (${mode}) adjusted to reach ${said(m, "text")} as text.`);
      if (name === "primary" && m.score(get(scales, name, mode, step).hex, n(1)) < m.bar("ui"))
        adjustments.push(
          `primary.${step} (${mode}) is under ${said(m, "ui")} on bg; the focus ring uses primary.11 instead.`,
        );
    }
  }

  const roles = {
    light: buildRoles(scales, "light", labels, solid, strips),
    dark: buildRoles(scales, "dark", labels, solid, strips),
  };
  for (const mode of ["light", "dark"] as Mode[]) {
    const ring = roles[mode].find((r) => r.name === "ring")!;
    if (m.score(ring.hex, roles[mode][0]!.hex) < m.bar("ui")) {
      const alt = get(scales, "primary", mode, 11);
      Object.assign(ring, { hex: alt.hex, css: alt.css, from: "primary.11" });
    }
  }
  const rec = recommend(input.stack);
  return {
    input,
    scales,
    custom: strips,
    solid,
    roles,
    checks: { light: runChecks(roles.light, m, strips), dark: runChecks(roles.dark, m, strips) },
    adjustments,
    type: buildType(input.type),
    space: buildSpace(input.density),
    shape: buildShape(input.roundness),
    shadows: {
      light: buildShadows(input.neutralHue ?? input.primary.hue, "light"),
      dark: buildShadows(input.neutralHue ?? input.primary.hue, "dark"),
    },
    motion: buildMotion(input.motion),
    data,
    charts: {
      ...buildCharts(
        data.map((c) => c.key),
        scales,
        scales.neutral,
        {
          light: get(scales, "neutral", "light", 1).hex,
          dark: get(scales, "neutral", "dark", 1).hex,
        },
        input.ramps,
      ),
      // "Other" is the neutral solid: quiet, but still 3:1 on the page.
      other: {
        light: get(scales, "neutral", "light", 9).hex,
        dark: get(scales, "neutral", "dark", 9).hex,
      },
    },
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

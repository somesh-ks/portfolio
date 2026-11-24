/**
 * Every export is a pure function of the System, so what you preview is
 * byte-for-byte what you download.
 */
import { stringifyYaml as stringify } from "./yaml";
import { DEFAULT_CURVE, ENDS, STEP_JOBS, STEPS, type Mode } from "./color";
import { COMPONENTS, ICONS, STYLING, iconStroke } from "./stack";
import { CONTRAST_LABEL, slug, type ScaleName, type System } from "./system";
import { fontStack, googleFontsUrl, ROLE_JOBS } from "./type";

export interface ExportFile {
  path: string;
  label: string;
  content: string;
}

const SCALES: ScaleName[] = ["accent", "neutral", "danger", "warning", "success", "info"];
/** Built-in scales, then the strips the user added. */
const scaleNames = (sys: System) => [...SCALES, ...sys.custom.map((c) => c.key)];
const px = (n: number) => `${n}px`;

/** Foundations every system needs that no slider changes: layers, states, sizes. */
const Z = {
  base: 0,
  raised: 10,
  dropdown: 1000,
  sticky: 1100,
  overlay: 1300,
  modal: 1400,
  toast: 1500,
  tooltip: 1600,
};
const OPACITY = { disabled: 0.5, muted: 0.7, scrim: 0.6 };
const BREAKPOINT = { sm: 640, md: 768, lg: 1024, xl: 1280 };
const ICON = { sm: 16, md: 20, lg: 24 };
const FOCUS = { width: 2, offset: 2 };

// ---------------------------------------------------------------- CSS

function colorVars(sys: System, mode: Mode, indent = "  "): string {
  const lines: string[] = [];
  for (const name of scaleNames(sys))
    for (const s of sys.scales[name]![mode]) lines.push(`${indent}--${name}-${s.step}: ${s.css};`);
  for (const r of sys.roles[mode]) {
    const ref = r.from.match(/^(\w+)\.(\d+)$/);
    lines.push(`${indent}--color-${r.name}: ${ref ? `var(--${ref[1]}-${ref[2]})` : r.css};`);
  }
  for (const k of ["sm", "md", "lg"] as const)
    lines.push(`${indent}--shadow-${k}: ${sys.shadows[mode][k]};`);
  return lines.join("\n");
}

function fontVars(
  sys: System,
  indent: string,
  fonts?: { body: string; heading: string; mono: string },
) {
  const f = sys.input.type;
  return [
    `${indent}--font-body: ${fonts?.body ?? fontStack(f.body, f.extra)};`,
    `${indent}--font-heading: ${fonts?.heading ?? fontStack(f.heading, f.extra)};`,
    `${indent}--font-mono: ${fonts?.mono ?? fontStack(f.mono, f.extra)};`,
  ];
}

function typeVars(sys: System, indent: string): string[] {
  return sys.type.tokens.flatMap((tok) => [
    `${indent}--text-${tok.role}: ${tok.size};`,
    `${indent}--text-${tok.role}--line-height: ${tok.lineHeight};`,
    `${indent}--text-${tok.role}--letter-spacing: ${tok.tracking}em;`,
    `${indent}--text-${tok.role}--font-weight: ${tok.weight};`,
  ]);
}

function spaceVars(sys: System, indent: string): string[] {
  const out = Object.entries(sys.space.scale).map(
    ([k, v]) => `${indent}--space-${k.replace(".", "-")}: ${px(v)};`,
  );
  out.push(
    `${indent}--control-sm: ${px(sys.space.control.sm)};`,
    `${indent}--control-md: ${px(sys.space.control.md)};`,
    `${indent}--control-lg: ${px(sys.space.control.lg)};`,
    `${indent}--pad-sm: ${px(sys.space.paddingX.sm)};`,
    `${indent}--pad-md: ${px(sys.space.paddingX.md)};`,
    `${indent}--pad-lg: ${px(sys.space.paddingX.lg)};`,
    `${indent}--gutter: ${px(sys.space.gutter)};`,
    `${indent}--section: ${px(sys.space.section)};`,
    `${indent}--measure: ${sys.space.measure};`,
    "",
  );
  for (const [k, v] of Object.entries(sys.shape.radius))
    out.push(`${indent}--radius-${k}: ${px(v)};`);
  out.push(
    `${indent}--border-width: ${px(sys.shape.border.default)};`,
    `${indent}--border-width-strong: ${px(sys.shape.border.strong)};`,
    `${indent}--focus-width: ${px(FOCUS.width)};`,
    `${indent}--focus-offset: ${px(FOCUS.offset)};`,
    "",
    ...Object.entries(ICON).map(([k, v]) => `${indent}--icon-${k}: ${px(v)};`),
    ...Object.entries(Z).map(([k, v]) => `${indent}--z-${k}: ${v};`),
    ...Object.entries(OPACITY).map(([k, v]) => `${indent}--opacity-${k}: ${v};`),
    `${indent}/* Breakpoints, for reference: custom properties can't be used inside @media. */`,
    ...Object.entries(BREAKPOINT).map(([k, v]) => `${indent}--breakpoint-${k}: ${px(v)};`),
  );
  return out;
}

function motionVars(sys: System, indent: string): string[] {
  const m = sys.motion;
  return [
    ...Object.entries(m.duration).map(([k, v]) => `${indent}--duration-${k}: ${v}ms;`),
    `${indent}--ease-out: ${m.easing.out};`,
    `${indent}--ease-in-out: ${m.easing.inOut};`,
    `${indent}--ease-spring: ${m.easing.spring};`,
  ];
}

function staticVars(
  sys: System,
  indent = "  ",
  fonts?: { body: string; heading: string; mono: string },
): string[] {
  return [
    ...fontVars(sys, indent, fonts),
    ...typeVars(sys, indent),
    "",
    ...spaceVars(sys, indent),
    "",
    ...motionVars(sys, indent),
  ];
}

const REDUCED_MOTION = [
  "@media (prefers-reduced-motion: reduce) {",
  "  :root {",
  "    --duration-fast: 0ms;",
  "    --duration-base: 0ms;",
  "    --duration-slow: 0ms;",
  "    --duration-spring: 0ms;",
  "    --ease-spring: linear;",
  "  }",
  "}",
];

/** Light, explicit dark, and system dark: the same three blocks tokens.css uses. */
function themed(sys: System, vars: (mode: Mode, indent: string) => string): string[] {
  return [
    ":root {",
    "  color-scheme: light;",
    vars("light", "  "),
    "}",
    "",
    `:root[data-theme="dark"] {`,
    "  color-scheme: dark;",
    vars("dark", "  "),
    "}",
    "",
    "@media (prefers-color-scheme: dark) {",
    `  :root:not([data-theme="light"]) {`,
    "    color-scheme: dark;",
    vars("dark", "    "),
    "  }",
    "}",
  ];
}

const AREAS = ["color", "type", "space", "motion"] as const;
export type Area = (typeof AREAS)[number];
const AREA_JSON: Record<Area, string[]> = {
  color: ["color"],
  type: ["font", "typography"],
  space: ["space", "radius", "shadow", "border", "focus", "icon", "breakpoint", "z", "opacity"],
  motion: ["duration", "easing"],
};
const AREA_NAME: Record<Area, string> = {
  color: "colors",
  type: "type",
  space: "space",
  motion: "motion",
};

const shadowLine = (l: string) => l.trimStart().startsWith("--shadow-");

/** One area of the system on its own, as CSS and DTCG, for the per-tool downloads. */
export function exportArea(sys: System, area: Area): { css: ExportFile; json: ExportFile } {
  const name = `${slug(sys.input.name)}-${AREA_NAME[area]}`;
  const head = `/* ${sys.input.name} ${AREA_NAME[area]}. Generated by Spring. */`;
  const body: string[] =
    area === "color"
      ? themed(sys, (m, i) =>
          colorVars(sys, m, i)
            .split("\n")
            .filter((l) => !shadowLine(l))
            .join("\n"),
        )
      : area === "type"
        ? [
            `/* Fonts: ${googleFontsUrl([sys.input.type.body, sys.input.type.heading, sys.input.type.mono], sys.input.type.extra)} */`,
            ...new Set(
              [
                sys.type.fallbacks.body.css,
                sys.type.fallbacks.heading.css,
                sys.type.fallbacks.mono.css,
              ].filter(Boolean),
            ),
            ":root {",
            ...fontVars(sys, "  "),
            ...typeVars(sys, "  "),
            "}",
          ]
        : area === "space"
          ? [
              ":root {",
              ...spaceVars(sys, "  "),
              "}",
              "",
              ...themed(sys, (m, i) =>
                colorVars(sys, m, i).split("\n").filter(shadowLine).join("\n"),
              ),
            ]
          : [":root {", ...motionVars(sys, "  "), "}", "", ...REDUCED_MOTION];
  const all = toDtcg(sys);
  const json = Object.fromEntries(["$description", ...AREA_JSON[area]].map((k) => [k, all[k]]));
  return {
    css: {
      path: `${name}.css`,
      label: `${AREA_NAME[area]} CSS`,
      content: [head, "", ...body, ""].join("\n"),
    },
    json: {
      path: `${name}.tokens.json`,
      label: `${AREA_NAME[area]} DTCG`,
      content: JSON.stringify(json, null, 2) + "\n",
    },
  };
}

function toCss(sys: System): string {
  const t = sys.type;
  const fonts = sys.input.type;
  const out: string[] = [
    `/* ${sys.input.name} design tokens. Generated by Spring. Import once at the root. */`,
    `/* Fonts: ${googleFontsUrl([fonts.body, fonts.heading, fonts.mono], fonts.extra)} */`,
    "",
    ...new Set(
      [t.fallbacks.body.css, t.fallbacks.heading.css, t.fallbacks.mono.css].filter(Boolean),
    ),
    "",
    ":root {",
    "  color-scheme: light;",
    colorVars(sys, "light"),
    "",
    ...staticVars(sys),
    "}",
    "",
    `:root[data-theme="dark"] {`,
    "  color-scheme: dark;",
    colorVars(sys, "dark"),
    "}",
    "",
    "@media (prefers-color-scheme: dark) {",
    `  :root:not([data-theme="light"]) {`,
    "    color-scheme: dark;",
    colorVars(sys, "dark", "    "),
    "  }",
    "}",
    "",
    ...REDUCED_MOTION,
    "",
  ];
  return out.join("\n");
}

/** One theme's variables under any selector, for live previews. */
export function toScopedCss(sys: System, selector: string, mode: Mode): string {
  return [
    `${selector} {`,
    `  color-scheme: ${mode};`,
    colorVars(sys, mode),
    ...staticVars(sys),
    "}",
  ].join("\n");
}

// ---------------------------------------------------------------- Tailwind v4

function toTailwind(sys: System): string {
  const lines = [
    `/* ${sys.input.name} for Tailwind CSS v4. Generated by Spring. */`,
    `@import "tailwindcss";`,
    `@import "./tokens.css";`,
    "",
    "/* Dark mode follows data-theme, and the OS when it isn't set. */",
    `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`,
    "",
    "/* inline: utilities read the variables at use time, so dark mode switches. */",
    "@theme inline {",
    "  --color-*: initial;",
    "  --color-white: #fff;",
    "  --color-black: #000;",
    "  --color-transparent: transparent;",
    "  --color-current: currentColor;",
  ];
  for (const r of sys.roles.light) lines.push(`  --color-${r.name}: var(--color-${r.name});`);
  for (const name of scaleNames(sys))
    for (const s of STEPS) lines.push(`  --color-${name}-${s}: var(--${name}-${s});`);
  lines.push(
    "",
    "  --font-*: initial;",
    "  --font-sans: var(--font-body);",
    "  --font-heading: var(--font-heading);",
    "  --font-mono: var(--font-mono);",
    "",
    "  --text-*: initial;",
  );
  for (const t of sys.type.tokens) {
    lines.push(
      `  --text-${t.role}: var(--text-${t.role});`,
      `  --text-${t.role}--line-height: var(--text-${t.role}--line-height);`,
      `  --text-${t.role}--letter-spacing: var(--text-${t.role}--letter-spacing);`,
      `  --text-${t.role}--font-weight: var(--text-${t.role}--font-weight);`,
    );
  }
  lines.push("", "  --spacing: 4px;", "", "  --radius-*: initial;");
  for (const k of Object.keys(sys.shape.radius)) lines.push(`  --radius-${k}: var(--radius-${k});`);
  lines.push("", "  --shadow-*: initial;");
  for (const k of ["sm", "md", "lg"]) lines.push(`  --shadow-${k}: var(--shadow-${k});`);
  lines.push(
    "",
    "  --ease-*: initial;",
    "  --ease-out: var(--ease-out);",
    "  --ease-in-out: var(--ease-in-out);",
    "  --ease-spring: var(--ease-spring);",
    "}",
  );
  if (sys.stack.components === "shadcn") {
    lines.push(
      "",
      "/* shadcn/ui variable names, mapped to the system. Note: shadcn's 'accent' is a hover fill, not the brand color. */",
      ':root, :root[data-theme="dark"] {',
      "  --background: var(--color-bg);",
      "  --foreground: var(--color-text);",
      "  --card: var(--color-bg-subtle);",
      "  --card-foreground: var(--color-text);",
      "  --popover: var(--color-bg);",
      "  --popover-foreground: var(--color-text);",
      "  --primary: var(--color-accent);",
      "  --primary-foreground: var(--color-accent-fg);",
      "  --secondary: var(--color-fill);",
      "  --secondary-foreground: var(--color-text);",
      "  --muted: var(--color-fill);",
      "  --muted-foreground: var(--color-text-muted);",
      "  --accent: var(--color-fill-hover);",
      "  --accent-foreground: var(--color-text);",
      "  --destructive: var(--color-danger);",
      "  --border: var(--color-border-subtle);",
      "  --input: var(--color-border);",
      "  --ring: var(--color-ring);",
      `  --radius: ${px(sys.shape.radius.md)};`,
      "}",
      "",
      "@theme inline {",
      ...[
        "background",
        "foreground",
        "card",
        "card-foreground",
        "popover",
        "popover-foreground",
        "primary",
        "primary-foreground",
        "secondary",
        "secondary-foreground",
        "muted",
        "muted-foreground",
        "accent",
        "accent-foreground",
        "destructive",
        "input",
      ]
        // bg-accent follows shadcn (a hover fill) so it pairs with text-accent-foreground;
        // the brand color stays on bg-primary.
        .map((n) => `  --color-${n}: var(--${n});`),
      "}",
    );
  }
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------- DTCG

const dtcgColor = (s: { oklch: { l: number; c: number; h: number }; hex: string }) => ({
  colorSpace: "oklch",
  components: [round(s.oklch.l), round(s.oklch.c), round(s.oklch.h, 2)],
  hex: s.hex,
});
const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;
const dim = (n: number) => ({ value: n, unit: "px" });

const cubic = (s: string) => s.match(/[\d.]+/g)!.map(Number);

function toDtcg(sys: System): Record<string, unknown> {
  const scale: Record<string, unknown> = {};
  for (const name of scaleNames(sys)) {
    const group: Record<string, unknown> = {};
    sys.scales[name]!.light.forEach((s, i) => {
      const d = sys.scales[name]!.dark[i]!;
      group[String(s.step)] = {
        $value: dtcgColor(s),
        $description: STEP_JOBS[s.step],
        $extensions: { mode: { light: dtcgColor(s), dark: dtcgColor(d) } },
      };
    });
    scale[name] = group;
  }
  const role: Record<string, unknown> = {};
  for (const r of sys.roles.light) {
    const dark = sys.roles.dark.find((d) => d.name === r.name)!;
    const ref = r.from.match(/^(\w+)\.(\d+)$/);
    if (ref && dark.from === r.from)
      role[r.name] = { $value: `{color.scale.${ref[1]}.${ref[2]}}`, $description: r.job };
    else {
      const lit = (hex: string, css: string) => ({
        colorSpace: "srgb",
        components: hexToRgb(hex),
        hex,
        ...(css !== hex ? {} : {}),
      });
      role[r.name] = {
        $value: lit(r.hex, r.css),
        $description: r.job,
        $extensions: { mode: { light: lit(r.hex, r.css), dark: lit(dark.hex, dark.css) } },
      };
    }
  }
  const typography: Record<string, unknown> = {};
  for (const t of sys.type.tokens) {
    typography[t.role] = {
      $type: "typography",
      $description: ROLE_JOBS[t.role],
      $value: {
        fontFamily: `{font.${t.role === "code" ? "mono" : ["display", "h1", "h2", "h3"].includes(t.role) ? "heading" : "body"}}`,
        fontSize: dim(t.max),
        fontWeight: t.weight,
        lineHeight: t.lineHeight,
        letterSpacing: { value: t.tracking, unit: "em" },
      },
    };
  }
  const shadow = (k: "sm" | "md" | "lg") => ({
    $type: "shadow",
    $value: sys.shadows.light.layers[k].map((l) => ({
      color: {
        colorSpace: "oklch",
        components: [l.color.l, l.color.c, l.color.h],
        alpha: l.color.alpha,
      },
      offsetX: dim(l.x),
      offsetY: dim(l.y),
      blur: dim(l.blur),
      spread: dim(l.spread),
    })),
  });
  return {
    $description: `${sys.input.name} design tokens. Generated by Spring. Colors carry light and dark values in $extensions.mode.`,
    color: { $type: "color", scale, role },
    font: {
      $type: "fontFamily",
      body: { $value: [sys.input.type.body, `${sys.input.type.body} Fallback`, "sans-serif"] },
      heading: {
        $value: [sys.input.type.heading, `${sys.input.type.heading} Fallback`, "sans-serif"],
      },
      mono: { $value: [sys.input.type.mono, `${sys.input.type.mono} Fallback`, "monospace"] },
    },
    typography,
    space: {
      $type: "dimension",
      ...Object.fromEntries(
        Object.entries(sys.space.scale).map(([k, v]) => [k.replace(".", "-"), { $value: dim(v) }]),
      ),
      control: {
        sm: { $value: dim(sys.space.control.sm) },
        md: { $value: dim(sys.space.control.md) },
        lg: { $value: dim(sys.space.control.lg) },
      },
      gutter: { $value: dim(sys.space.gutter) },
      section: { $value: dim(sys.space.section) },
    },
    radius: {
      $type: "dimension",
      ...Object.fromEntries(
        Object.entries(sys.shape.radius).map(([k, v]) => [k, { $value: dim(v) }]),
      ),
    },
    shadow: { sm: shadow("sm"), md: shadow("md"), lg: shadow("lg") },
    border: {
      $type: "dimension",
      default: { $value: dim(sys.shape.border.default) },
      strong: { $value: dim(sys.shape.border.strong) },
    },
    focus: {
      $type: "dimension",
      width: { $value: dim(FOCUS.width) },
      offset: { $value: dim(FOCUS.offset) },
    },
    icon: {
      $type: "dimension",
      ...Object.fromEntries(Object.entries(ICON).map(([k, v]) => [k, { $value: dim(v) }])),
    },
    breakpoint: {
      $type: "dimension",
      ...Object.fromEntries(Object.entries(BREAKPOINT).map(([k, v]) => [k, { $value: dim(v) }])),
    },
    z: {
      $type: "number",
      ...Object.fromEntries(Object.entries(Z).map(([k, v]) => [k, { $value: v }])),
    },
    opacity: {
      $type: "number",
      ...Object.fromEntries(Object.entries(OPACITY).map(([k, v]) => [k, { $value: v }])),
    },
    duration: {
      $type: "duration",
      ...Object.fromEntries(
        Object.entries(sys.motion.duration).map(([k, v]) => [
          k,
          { $value: { value: v, unit: "ms" } },
        ]),
      ),
    },
    easing: {
      $type: "cubicBezier",
      out: { $value: cubic(sys.motion.easing.out) },
      "in-out": { $value: cubic(sys.motion.easing.inOut) },
    },
  };
}

function hexToRgb(hex: string): number[] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => round(parseInt(h.slice(i, i + 2), 16) / 255));
}

// ---------------------------------------------------------------- DESIGN.md

export function toDesignMd(sys: System): string {
  const l = Object.fromEntries(sys.roles.light.map((r) => [r.name, r]));
  const d = Object.fromEntries(sys.roles.dark.map((r) => [r.name, r]));
  const T = Object.fromEntries(sys.type.tokens.map((t) => [t.role, t]));
  const comp = COMPONENTS[sys.stack.components]!;
  const icon = ICONS[sys.stack.icons]!;
  const stroke = iconStroke(T.body!.weight);
  const tokenNames: Record<string, string> = {
    primary: "accent",
    "on-primary": "accent-fg",
    "primary-hover": "accent-hover",
    "primary-subtle": "accent-subtle",
    "primary-text": "accent-text",
    neutral: "bg",
    surface: "bg-subtle",
    fill: "fill",
    "fill-hover": "fill-hover",
    "on-surface": "text",
    "on-surface-muted": "text-muted",
    border: "border",
    "border-subtle": "border-subtle",
    ring: "ring",
    error: "danger",
    "on-error": "danger-fg",
    "error-text": "danger-text",
    warning: "warning",
    "on-warning": "warning-fg",
    success: "success",
    "on-success": "success-fg",
    info: "info",
    "on-info": "info-fg",
  };
  const colors = Object.fromEntries(
    Object.entries(tokenNames).map(([k, role]) => [k, l[role]!.hex]),
  );
  const typography = Object.fromEntries(
    sys.type.tokens.map((t) => [
      t.role === "body" ? "body-md" : t.role === "display" ? "headline-display" : t.role,
      {
        fontFamily: t.family,
        fontSize: px(t.max),
        fontWeight: t.weight,
        lineHeight: t.lineHeight,
        letterSpacing: `${t.tracking}em`,
      },
    ]),
  );
  const rounded = Object.fromEntries(Object.entries(sys.shape.radius).map(([k, v]) => [k, px(v)]));
  const spacing: Record<string, string> = {
    base: px(sys.space.unit),
    xs: px(4),
    sm: px(8),
    md: px(16),
    lg: px(24),
    xl: px(48),
    gutter: px(sys.space.gutter),
    section: px(sys.space.section),
  };
  const components = {
    "button-primary": {
      backgroundColor: "{colors.primary}",
      textColor: "{colors.on-primary}",
      typography: "{typography.label}",
      rounded: "{rounded.md}",
      height: px(sys.space.control.md),
      padding: px(sys.space.paddingX.md),
    },
    "button-primary-hover": { backgroundColor: "{colors.primary-hover}" },
    "button-secondary": {
      backgroundColor: "{colors.fill}",
      textColor: "{colors.on-surface}",
      typography: "{typography.label}",
      rounded: "{rounded.md}",
      height: px(sys.space.control.md),
      padding: px(sys.space.paddingX.md),
    },
    "button-secondary-hover": { backgroundColor: "{colors.fill-hover}" },
    input: {
      backgroundColor: "{colors.neutral}",
      textColor: "{colors.on-surface}",
      typography: "{typography.body-md}",
      rounded: "{rounded.md}",
      height: px(sys.space.control.md),
      padding: px(sys.space.paddingX.md),
    },
    card: {
      backgroundColor: "{colors.surface}",
      textColor: "{colors.on-surface}",
      rounded: "{rounded.lg}",
      padding: px(sys.space.gutter),
    },
    badge: {
      backgroundColor: "{colors.primary-subtle}",
      textColor: "{colors.primary-text}",
      typography: "{typography.caption}",
      rounded: "{rounded.full}",
    },
    // Edges and text helpers are modelled as tiny components because the
    // spec's component properties have no border property yet.
    "input-border": { backgroundColor: "{colors.border}", height: "1px" },
    divider: { backgroundColor: "{colors.border-subtle}", height: "1px" },
    "focus-ring": { backgroundColor: "{colors.ring}", width: "2px" },
    "helper-text": { textColor: "{colors.on-surface-muted}", typography: "{typography.caption}" },
    "error-message": { textColor: "{colors.error-text}", typography: "{typography.caption}" },
    "button-danger": {
      backgroundColor: "{colors.error}",
      textColor: "{colors.on-error}",
      typography: "{typography.label}",
      rounded: "{rounded.md}",
      height: px(sys.space.control.md),
    },
    "badge-success": {
      backgroundColor: "{colors.success}",
      textColor: "{colors.on-success}",
      rounded: "{rounded.full}",
    },
    "badge-warning": {
      backgroundColor: "{colors.warning}",
      textColor: "{colors.on-warning}",
      rounded: "{rounded.full}",
    },
    "badge-info": {
      backgroundColor: "{colors.info}",
      textColor: "{colors.on-info}",
      rounded: "{rounded.full}",
    },
  };
  const front = stringify(
    {
      version: "alpha",
      name: sys.input.name,
      description: `${sys.input.name} design system. Generated by Spring; light-mode values below, dark values in the Colors section and tokens.css.`,
      colors,
      typography,
      rounded,
      spacing,
      components,
    },
    { lineWidth: 0 },
  );

  const isRound =
    sys.shape.radius.md >= 10
      ? "soft and friendly"
      : sys.shape.radius.md <= 2
        ? "sharp and precise"
        : "lightly rounded";
  const dens =
    sys.input.density < 0.34 ? "compact" : sys.input.density < 0.67 ? "balanced" : "spacious";
  const mot = sys.input.motion < 0.34 ? "calm" : sys.input.motion < 0.67 ? "responsive" : "lively";
  const row = (name: string, job: string) =>
    `| \`${name}\` | ${l[name]!.hex} | ${d[name]!.hex} | ${job} |`;

  const body = `# ${sys.input.name}

## Overview

${sys.input.name} is a ${dens}, ${isRound} interface with ${mot} motion. One accent color carries every primary action; everything else is neutral. Light and dark themes are equal citizens: dark values are generated for dark backgrounds, not inverted.

Source files: \`tokens.css\` (all values, both themes), \`tokens.json\` (DTCG), ${sys.stack.styling === "tailwind" ? "`theme.css` (Tailwind v4)" : "no framework layer"}. When a value isn't in these files, it isn't in the system: ask, don't invent.

## Colors

The accent is **${l.accent!.hex}** (light) / **${d.accent!.hex}** (dark). Neutrals are tinted toward the accent hue so surfaces and brand feel related. Every text pair below passes ${CONTRAST_LABEL[sys.input.contrast ?? "aa"]} in both themes.

| Role | Light | Dark | Use for |
|---|---|---|---|
${sys.roles.light.map((r) => row(r.name, r.job)).join("\n")}

Each color is also a 12-step scale (\`--accent-1\` … \`--accent-12\`). Steps run one way along a lightness curve and have jobs: 1–2 backgrounds, 3–5 component fills (rest, hover, pressed), 6–8 borders, 11–12 text. The brand color sits on step ${sys.scales.accent.anchor.light} and solid buttons use step ${sys.solid.accent.light} (light) / ${sys.solid.accent.dark} (dark); use the \`accent\` role rather than the step. \`palette.js\` regenerates every scale from the seed and curve.

## Typography

Headings use **${sys.input.type.heading}**, text uses **${sys.input.type.body}**, code uses **${sys.input.type.mono}**. The scale ratio is ${sys.input.type.ratio}${sys.input.type.fluid ? `, fluid between ${360}px and ${1280}px viewports (headings shrink on phones; body text never does)` : ""}. Line heights sit on a 4px grid (2px below 20px), and tracking tightens as size grows.

| Role | Size | Line height | Tracking | Weight | Use for |
|---|---|---|---|---|---|
${sys.type.tokens.map((t) => `| \`${t.role}\` | ${t.min === t.max ? `${t.max}px` : `${t.min}–${t.max}px`} | ${t.lineHeightPx}px | ${t.tracking}em | ${t.weight} | ${ROLE_JOBS[t.role]} |`).join("\n")}

Keep running text under ${sys.space.measure} wide. Use only these roles; don't set font sizes by hand.

## Layout

Spacing is a 4px grid: use \`--space-*\` steps only (4, 8, 12, 16, 24, 32, 48…). Controls are ${sys.space.control.md}px tall (${sys.space.control.sm}px small, ${sys.space.control.lg}px large). Gutter ${sys.space.gutter}px, section spacing ${sys.space.section}px. Breakpoints: ${Object.entries(
    sys.space.breakpoints,
  )
    .map(([k, v]) => `${k} ${v}px`)
    .join(", ")}.

## Elevation & Depth

Hierarchy comes from tonal surfaces first (\`bg\` → \`bg-subtle\` → \`fill\`), borders second, shadows last. Shadows are tinted with the neutral hue: \`--shadow-sm\` for raised controls, \`--shadow-md\` for popovers and menus, \`--shadow-lg\` for dialogs. In dark mode, rely on lighter surfaces and borders; shadows are barely visible.

## Shapes

Corners are ${isRound}: ${Object.entries(sys.shape.radius)
    .filter(([k]) => k !== "full" && k !== "none")
    .map(([k, v]) => `${k} ${v}px`)
    .join(
      ", ",
    )}, full for pills. Controls use \`md\`, cards \`lg\`, dialogs \`xl\`. **Nested corners:** inner radius = outer radius − padding, never the same radius inside and out.

## Components

Built with **${comp.name}** (${comp.url}). Icons: **${icon.name}** only${icon.strokeAware ? `, ${stroke}px stroke to match ${T.body!.weight} weight text` : ""}, sized to the text they sit beside (16px with body, 20px with h3). Styling: **${STYLING[sys.stack.styling].name}**.

- **Primary button:** \`accent\` fill, \`accent-fg\` label, one per view.
- **Secondary button:** \`fill\` with \`text\`; hover \`fill-hover\`, pressed \`fill-active\`.
- **Input:** \`bg\` fill, \`border\` edge, \`border-strong\` on hover, \`ring\` on focus (2px, offset 2px); placeholder \`text-muted\`; error \`danger\` border with \`danger-text\` message.
- **Card:** \`bg-subtle\`, \`border-subtle\` edge, \`lg\` radius, ${sys.space.gutter}px padding.
- **Badge:** \`accent-subtle\` with \`accent-text\`; status badges use \`<status>-subtle\` with \`<status>-text\`.

## Motion

Durations: ${Object.entries(sys.motion.duration)
    .filter(([k]) => k !== "instant")
    .map(([k, v]) => `${k} ${v}ms`)
    .join(
      ", ",
    )}. Enter with \`--ease-out\`, move on screen with \`--ease-in-out\`, use \`--ease-spring\` with \`--duration-spring\` for things the user drags or toggles. Animate only transform and opacity. Under \`prefers-reduced-motion\`, durations drop to 0.

## Do's and Don'ts

- Do use one \`accent\` action per view; everything else is secondary.
- Do use roles (\`text\`, \`bg-subtle\`, \`border\`) in components, and raw scale steps only for one-off illustration.
- Don't put \`text-muted\` on \`accent\`, or body text on any solid fill.
- Don't add colors, sizes, radii or shadows that aren't tokens. If one is missing, flag it.
- Don't mix icon sets. ${icon.name} only.
- Don't use the same radius on nested elements.
- Do check both themes before calling a screen done.
`;
  return `---\n${front}---\n\n${body}`;
}

// ---------------------------------------------------------------- Agent skill

function toSkill(sys: System): string {
  const name = `${slug(sys.input.name)}-design-system`;
  const icon = ICONS[sys.stack.icons]!;
  const comp = COMPONENTS[sys.stack.components]!;
  return `---
name: ${name}
description: Applies the ${sys.input.name} design system to any UI work in this project (components, pages, styling, colors, type, spacing, icons, motion). Use whenever writing or reviewing UI code here.
---

# ${sys.input.name} design system

The system lives in \`DESIGN.md\` (rules and rationale) and \`tokens.css\` (every value). Read DESIGN.md before writing UI. These rules are not optional.

## Hard rules

1. **Tokens only.** Every color, font size, line height, spacing, radius, shadow, duration and easing comes from a token. No hex codes, no arbitrary px, no Tailwind arbitrary values like \`p-[13px]\`. If a value is missing, say so and stop; don't invent one.
2. **Roles before steps.** Use role tokens (\`bg\`, \`text\`, \`text-muted\`, \`fill\`, \`border\`, \`accent\`, \`accent-fg\`…). Raw scale steps (\`accent-3\`) only for their documented step job.
3. **One primary action per view** uses \`accent\`. Everything else is secondary (\`fill\`) or ghost.
4. **Type roles only:** display, h1, h2, h3, body-lg, body, label, caption, code. Never set font-size by hand.
5. **Icons: ${icon.name} only.**${icon.strokeAware ? ` Stroke ${iconStroke(sys.type.tokens.find((t) => t.role === "body")!.weight)}px.` : ""} Never import a second icon library.
6. **Components: ${comp.name}.** Extend it; don't add another component library.
7. **Nested radius:** inner = outer − padding.
8. **Both themes.** Never hardcode light-only colors; roles switch automatically with \`data-theme\`.
9. **Motion:** transform and opacity only, durations from tokens, respect reduced motion.

## Before you finish

- Search your diff for \`#\`, \`rgb(\`, \`px\` outside token files and arbitrary values. Replace each with a token.
- Check every new text color against its background in DESIGN.md's Colors table.
- Confirm no new dependency for icons or components was added.
`;
}

function toAgentsSnippet(sys: System): string {
  return `## Design system

UI follows **${sys.input.name}**: read \`DESIGN.md\` before writing UI, and use only tokens from \`tokens.css\`. Icons: ${ICONS[sys.stack.icons]!.name} only. Components: ${COMPONENTS[sys.stack.components]!.name}. Never add colors, sizes or radii that aren't tokens.
`;
}

export function toPrompt(sys: System): string {
  return `Set up the ${sys.input.name} design system in this project.

1. Save the attached files: \`DESIGN.md\` at the repo root, \`tokens.css\` and ${sys.stack.styling === "tailwind" ? "`theme.css` next to the global stylesheet (import `theme.css` from it instead of `tailwindcss`)" : "import `tokens.css` once in the root layout"}, \`tokens.json\` in \`tokens/\`, and the skill in \`.claude/skills/${slug(sys.input.name)}-design-system/SKILL.md\` (or \`.agents/skills/\`).
2. Add the AGENTS.md snippet below to AGENTS.md (create it if missing).
3. Load the fonts: ${googleFontsUrl([sys.input.type.body, sys.input.type.heading, sys.input.type.mono], sys.input.type.extra)}${sys.input.type.body === "Geist" || sys.input.type.heading === "Geist" ? " (or the `geist` npm package)" : ""}.
4. Install: ${[COMPONENTS[sys.stack.components]!.install, ICONS[sys.stack.icons]!.install].join(" and ")}.
5. Replace any existing hardcoded colors, font sizes and radii in global styles with the new tokens. Show me what you changed.

From now on, follow DESIGN.md for all UI work and use only its tokens.

${toAgentsSnippet(sys)}`;
}

export function exportAll(sys: System): ExportFile[] {
  const files: ExportFile[] = [
    { path: "DESIGN.md", label: "DESIGN.md", content: toDesignMd(sys) },
    { path: "tokens.css", label: "CSS variables", content: toCss(sys) },
    {
      path: "tokens.json",
      label: "DTCG tokens",
      content: JSON.stringify(toDtcg(sys), null, 2) + "\n",
    },
  ];
  if (sys.stack.styling === "tailwind")
    files.push({ path: "theme.css", label: "Tailwind v4 theme", content: toTailwind(sys) });
  files.push(
    {
      path: `skills/${slug(sys.input.name)}-design-system/SKILL.md`,
      label: "Agent skill",
      content: toSkill(sys),
    },
    { path: "AGENTS.md", label: "AGENTS.md snippet", content: toAgentsSnippet(sys) },
    { path: "palette.js", label: "Headless palette", content: toPaletteJs(sys) },
  );
  return files;
}

/**
 * The palette as code: the seed, the curve and a dependency-free generator, so
 * any repo or agent can rebuild every scale (or a new hue) without Spring.
 * Mirrors buildScale in color.ts; the unit test runs it and compares.
 */
function toPaletteJs(sys: System): string {
  const i = sys.input;
  const curve = i.curve ?? DEFAULT_CURVE;
  // Grays and statuses hold one hue; the brand and added strips bend with the hue shift.
  const bends = new Set(["accent", ...sys.custom.map((c) => c.key)]);
  const scales = Object.fromEntries(
    scaleNames(sys).map((k) => [k, { ...sys.scales[k]!.seed, bend: bends.has(k) }]),
  );
  return `// ${i.name} palette, generated by Spring (someshks.com/spring).
// Headless: change a seed or the curve and call scale() to rebuild. No dependencies.
// Note: the system's contrast fixes (nudged text steps) are applied on top in tokens.css.

export const curve = ${JSON.stringify(curve)};
export const ends = ${JSON.stringify(ENDS)};
export const seeds = ${JSON.stringify(scales, null, 2)};

const cubic = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
export function ease([x1, y1, x2, y2], x) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (cubic(x1, x2, mid) < x) lo = mid; else hi = mid;
  }
  return cubic(y1, y2, (lo + hi) / 2);
}

function toLinear({ l, c, h }) {
  const r = (h * Math.PI) / 180, a = c * Math.cos(r), b = c * Math.sin(r);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
}
const inGamut = (c) => toLinear(c).every((v) => v >= -1e-4 && v <= 1 + 1e-4);
function fit(c) {
  if (inGamut(c)) return c;
  let lo = 0, hi = c.c;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut({ ...c, c: mid })) lo = mid; else hi = mid;
  }
  return { ...c, c: lo };
}
const gamma = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
export function hex(c) {
  return "#" + toLinear(fit(c)).map((v) => Math.round(Math.min(1, Math.max(0, gamma(v))) * 255).toString(16).padStart(2, "0")).join("");
}

/** 12 steps, page to text, bent through the seed's lightness. mode: "light" | "dark". */
export function scale({ hue, chroma, l: target, bend = true }, mode = "light", c = curve) {
  const [from, to] = ends[mode];
  const e = Array.from({ length: 12 }, (_, i) => ease(c.bezier, i / 11));
  const raw = e.map((y) => from + (to - from) * y);
  let k = 3;
  for (let s = 3; s <= 10; s++) if (Math.abs(raw[s - 1] - target) < Math.abs(raw[k - 1] - target)) k = s;
  const ek = e[k - 1];
  const lb = Math.min(Math.max(target, Math.min(from, to) + 0.02), Math.max(from, to) - 0.02);
  const tk = (k - 1) / 11;
  return e.map((y, i) => {
    const t = i / 11;
    const l = i < k - 1 ? from + (lb - from) * (ek ? y / ek : 0) : lb + (to - lb) * (ek < 1 ? (y - ek) / (1 - ek) : 0);
    const w = t < tk ? Math.max(tk, 0.35) : 0.55;
    const share = Math.max(t > tk ? 0.4 : 0.05, 1 - ((t - tk) / w) ** 2);
    return hex({ l, c: chroma * share * (mode === "dark" ? (c.darkChroma ?? 1) : 1), h: (((hue + (bend ? c.hueShift : 0) * (t - tk)) % 360) + 360) % 360 });
  });
}
`;
}

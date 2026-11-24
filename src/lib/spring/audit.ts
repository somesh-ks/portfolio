/**
 * Audit: read a design system someone (or some agent) already made, from a
 * DESIGN.md, a DTCG tokens.json, CSS variables or a Tailwind config, and
 * report what's broken. Then infer the closest Spring input so "fix all" can
 * rebuild it.
 */
import { parseYaml } from "./yaml";
import { contrast, parseColor } from "./color";
import { FONT_NAMES, opticalBase, type FontName } from "./type";
import { DEFAULT_INPUT, type SystemInput } from "./system";
import { oklchToHex, over } from "./colormath";
import { namedColor } from "./css-names";

type Format = "design.md" | "dtcg" | "css" | "tailwind";

interface Color {
  name: string;
  /** For display and nearness; rounded to 8 bits. */
  hex: string;
  /** The value as written, resolved, for exact contrast (keeps alpha and oklch precision). */
  css: string;
  /** The dark theme's value, when the system has one. */
  dark?: string;
}

interface Parsed {
  format: Format;
  name?: string;
  colors: Color[];
  type: {
    name: string;
    size: number;
    lineHeight?: number;
    tracking?: number;
    weight?: number;
    family?: string;
  }[];
  radii: { name: string; px: number }[];
  spacing: { name: string; px: number }[];
  hasDark: boolean;
  /** Only a dark theme: its values sit in `css`. */
  darkOnly?: boolean;
}

type Status = "pass" | "warn" | "fail";

interface Finding {
  id: string;
  area: "Color" | "Type" | "Space" | "Shape" | "Coverage";
  status: Status;
  title: string;
  detail: string;
  /** What Spring does about it in "fix all". */
  fix?: string;
}

export interface Report {
  parsed: Parsed;
  findings: Finding[];
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  input: SystemInput;
}

// ------------------------------------------------------------------ parsing

const toPx = (v: unknown): number | undefined => {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "value" in v) {
    const o = v as { value: number; unit?: string };
    return o.unit === "rem" || o.unit === "em" ? o.value * 16 : o.value;
  }
  if (typeof v !== "string") return undefined;
  const cl = v.match(/^clamp\((.+),\s*([^,]+)\)$/);
  if (cl) return toPx(cl[2]!.trim());
  const m = v.trim().match(/^(-?[\d.]+)(px|rem|em)?$/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return m[2] === "rem" || m[2] === "em" ? n * 16 : n;
};

/** Any color value as a CSS string parseColor can read, or undefined. */
const cssOf = (v: unknown): string | undefined => {
  if (typeof v === "string") {
    const s = v.trim();
    const named = namedColor(s);
    if (named) return named;
    // Old shadcn style: bare HSL channels, used as hsl(var(--x)).
    if (/^-?[\d.]+(deg)?\s+[\d.]+%\s+[\d.]+%(\s*\/\s*[\d.]+%?)?$/.test(s)) return `hsl(${s})`;
    return s.toLowerCase() === "transparent" || parseColor(s) ? s : undefined;
  }
  if (v && typeof v === "object") {
    const o = v as { hex?: string; colorSpace?: string; components?: number[]; alpha?: number };
    const a = o.alpha !== undefined && o.alpha < 1 ? ` / ${o.alpha}` : "";
    if (o.colorSpace && o.components) {
      const [x, y, z] = o.components;
      if (o.colorSpace === "oklch") return `oklch(${x} ${y} ${z}${a})`;
      if (o.colorSpace === "srgb") return `rgb(${x! * 255} ${y! * 255} ${z! * 255}${a})`;
    }
    if (o.hex) return cssOf(o.hex);
  }
  return undefined;
};

const color = (name: string, v: unknown, dark?: unknown): Color | undefined => {
  const css = cssOf(v);
  const c = css ? parseColor(css) : null;
  if (!css || !c) return undefined;
  const d = dark === undefined ? undefined : cssOf(dark);
  return { name, hex: oklchToHex(c), css, dark: d };
};

function detect(text: string): Format {
  const t = text.trimStart();
  if (t.startsWith("{")) return "dtcg";
  if (/module\.exports|export\s+default|\btheme\s*:\s*\{/.test(t) && !/--[\w-]+\s*:/.test(t))
    return "tailwind";
  if (t.startsWith("---") || /^#\s/m.test(t)) return "design.md";
  return "css";
}

const dims = (o: unknown) =>
  Object.entries((o ?? {}) as Record<string, unknown>)
    .map(([name, v]) => ({ name, px: toPx(v) }))
    .filter((d): d is { name: string; px: number } => d.px !== undefined);

const isColor = (c: Color | undefined): c is Color => !!c;

function parseDesignMd(text: string): Parsed {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const y = (m ? parseYaml(m[1]!) : {}) as Record<string, unknown>;
  const colors = Object.entries((y.colors ?? {}) as Record<string, unknown>)
    .map(([name, v]) => color(name, v))
    .filter(isColor);
  const type = Object.entries(
    (y.typography ?? {}) as Record<string, Record<string, unknown>>,
  ).flatMap(([name, t]) => {
    const size = toPx(t?.fontSize);
    if (!size) return [];
    const lh = t.lineHeight;
    const lineHeight = typeof lh === "number" ? lh : toPx(lh) ? toPx(lh)! / size : undefined;
    const tr = typeof t.letterSpacing === "string" ? t.letterSpacing.match(/^(-?[\d.]+)em$/) : null;
    const trPx = toPx(t.letterSpacing);
    return [
      {
        name,
        size,
        lineHeight,
        tracking: tr ? Number(tr[1]) : trPx !== undefined ? trPx / size : undefined,
        weight: t.fontWeight !== undefined ? Number(t.fontWeight) : undefined,
        family: typeof t.fontFamily === "string" ? t.fontFamily : undefined,
      },
    ];
  });
  return {
    format: "design.md",
    name: typeof y.name === "string" ? y.name : undefined,
    colors,
    type,
    radii: dims(y.rounded),
    spacing: dims(y.spacing),
    hasDark: /dark/i.test(text.slice(m?.[0].length ?? 0)),
  };
}

/** Font sizes, line heights and tracking are dimensions too; they aren't spacing. */
const TYPE_DIM = /(font|size|line|letter|tracking|leading|text)/i;

function parseDtcg(text: string): Parsed {
  let root: Record<string, unknown>;
  try {
    root = JSON.parse(text) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`Not valid JSON, so nothing was audited: ${(e as Error).message}`, {
      cause: e,
    });
  }
  const out: Parsed = {
    format: "dtcg",
    colors: [],
    type: [],
    radii: [],
    spacing: [],
    hasDark: false,
  };
  const all = new Map<string, unknown>();
  // Follow alias chains ({a} -> {b} -> value), not just one hop.
  const deref = (v: unknown) => {
    for (let hop = 0; hop < 10 && typeof v === "string" && /^\{.+\}$/.test(v); hop++) {
      const next = all.get(v.slice(1, -1));
      if (next === undefined) break;
      v = next;
    }
    return v;
  };
  const walk = (node: unknown, path: string[], inherited?: string) => {
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    const type = (o.$type as string) ?? inherited;
    if ("$value" in o) {
      all.set(path.join("."), o.$value);
      const name = path.join("-");
      const v = deref(o.$value);
      const ext = (o.$extensions as Record<string, unknown> | undefined)?.mode as
        | Record<string, unknown>
        | undefined;
      if (ext?.dark) out.hasDark = true;
      if (type === "color") {
        const c = color(name, v, ext?.dark === undefined ? undefined : deref(ext.dark));
        if (c) out.colors.push(c);
      } else if (type === "typography" && v && typeof v === "object") {
        const t = Object.fromEntries(
          Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, deref(x)]),
        );
        const size = toPx(t.fontSize);
        const lh = t.lineHeight;
        const ls = t.letterSpacing as { value?: number; unit?: string } | string | undefined;
        if (size)
          out.type.push({
            name,
            size,
            lineHeight: typeof lh === "number" ? lh : toPx(lh) ? toPx(lh)! / size : undefined,
            tracking:
              typeof ls === "object" && ls?.unit === "em"
                ? ls.value
                : typeof ls === "string" && ls.endsWith("em")
                  ? parseFloat(ls)
                  : undefined,
            weight: t.fontWeight !== undefined ? Number(t.fontWeight) : undefined,
            family: typeof t.fontFamily === "string" ? t.fontFamily : undefined,
          });
      } else if (type === "dimension") {
        const px = toPx(v);
        if (px !== undefined && !TYPE_DIM.test(name))
          (/radius|round|corner/i.test(name) ? out.radii : out.spacing).push({ name, px });
      }
      return;
    }
    for (const [k, child] of Object.entries(o))
      if (!k.startsWith("$")) walk(child, [...path, k], type);
  };
  // Two passes so references resolve regardless of order.
  walk(root, []);
  out.colors = [];
  out.type = [];
  out.radii = [];
  out.spacing = [];
  walk(root, []);
  if (/"dark"/.test(text)) out.hasDark = true;
  return out;
}

const DARK =
  /prefers-color-scheme:\s*dark|\.dark\b|\[data-(theme|mode|color-scheme)=["']?dark|theme-dark|dark-theme/i;
/** Blocks that aren't a theme: high contrast, forced colors, print. */
const OTHER = /prefers-contrast|forced-colors|\bprint\b/i;

/** Custom properties per theme, with later rules winning as in the cascade. */
function cssThemes(text: string) {
  const light = new Map<string, string>();
  const dark = new Map<string, string>();
  let schemeDark = false;
  const src = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const stack: string[] = [];
  let buf = "";
  const take = () => {
    const ctx = stack.join(" ");
    const m = buf.match(/^\s*--([\w-]+)\s*:\s*([\s\S]+?)\s*$/);
    if (m && !OTHER.test(ctx)) (DARK.test(ctx) ? dark : light).set(m[1]!, m[2]!);
    if (/^\s*color-scheme\s*:\s*dark\s*$/.test(buf) && !DARK.test(ctx)) schemeDark = true;
    buf = "";
  };
  for (const ch of src) {
    if (ch === "{") {
      stack.push(buf.trim());
      buf = "";
    } else if (ch === "}") {
      take();
      stack.pop();
    } else if (ch === ";") take();
    else buf += ch;
  }
  take();
  return { light, dark, schemeDark };
}

/** Replace var(--x, fallback) with its value, a few levels deep. */
function resolveVars(v: string, vars: Map<string, string>): string {
  for (let i = 0; i < 8 && v.includes("var("); i++)
    v = v.replace(/var\(\s*--([\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (all, n, fb) =>
      vars.has(n) ? vars.get(n)! : fb !== undefined ? fb.trim() : all,
    );
  return v.trim();
}

function parseCss(text: string): Parsed {
  const { light, dark, schemeDark } = cssThemes(text);
  const darkOnly = schemeDark && !dark.size;
  const darkVars = new Map([...light, ...dark]);
  const out: Parsed = {
    format: "css",
    colors: [],
    type: [],
    radii: [],
    spacing: [],
    hasDark: dark.size > 0 || darkOnly,
    darkOnly,
  };
  const vars = new Map([...light].map(([k, v]) => [k, resolveVars(v, light)]));
  for (const [name, v] of vars) {
    if (/(radius|rounded)/i.test(name)) {
      const px = toPx(v);
      if (px !== undefined) out.radii.push({ name, px });
      continue;
    }
    if (/(space|spacing|gap|gutter)/i.test(name)) {
      const px = toPx(v);
      if (px !== undefined) out.spacing.push({ name, px });
      continue;
    }
    if (
      /(font-size|text-[\w-]+$|fs-)/i.test(name) &&
      !/(line-height|letter-spacing|weight|color|leading|tracking)/i.test(name)
    ) {
      const px = toPx(v);
      if (px !== undefined) {
        // Tailwind 4 pairs --text-sm with --text-sm--line-height; others use --leading-sm.
        const key = name.replace(/^(text|font-size|fs)-/, "");
        const lh =
          vars.get(`${name}--line-height`) ??
          vars.get(`${name}-line-height`) ??
          vars.get(`leading-${key}`) ??
          vars.get(`line-height-${key}`) ??
          vars.get("leading") ??
          vars.get("line-height");
        const tr = (
          vars.get(`${name}--letter-spacing`) ??
          vars.get(`${name}-letter-spacing`) ??
          vars.get(`tracking-${key}`)
        )?.match(/^(-?[\d.]+)em$/);
        out.type.push({
          name,
          size: px,
          lineHeight: lh && !isNaN(Number(lh)) ? Number(lh) : undefined,
          tracking: tr ? Number(tr[1]) : undefined,
        });
        continue;
      }
    }
    if (/(shadow|font|ease|duration|transition|z-|index)/i.test(name)) continue;
    const c = color(
      name,
      v,
      dark.size ? resolveVars(darkVars.get(name) ?? v, darkVars) : undefined,
    );
    if (c) out.colors.push(c);
  }
  return out;
}

/** A Tailwind config's theme object, read as data (functions and imports can't be). */
function parseTailwind(text: string): Parsed {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1");
  const at = src.search(/\btheme\s*:\s*\{/);
  if (at < 0) throw new Error("No theme object found in this Tailwind config.");
  const start = src.indexOf("{", at);
  let depth = 0;
  let end = start;
  for (; end < src.length; end++) {
    if (src[end] === "{") depth++;
    else if (src[end] === "}" && --depth === 0) break;
  }
  const json = src
    .slice(start, end + 1)
    .replace(/'([^'\\]*)'/g, (_, s: string) => JSON.stringify(s))
    .replace(/([{,]\s*)([\w$-]+)\s*:/g, '$1"$2":')
    .replace(/,(\s*[}\]])/g, "$1");
  let theme: Record<string, unknown>;
  try {
    theme = JSON.parse(json) as Record<string, unknown>;
  } catch (e) {
    throw new Error("This Tailwind theme uses code (functions or imports), so it can't be read.", {
      cause: e,
    });
  }
  const t = { ...theme, ...(theme.extend as Record<string, unknown> | undefined) };
  const colors: Color[] = [];
  const flat = (o: unknown, path: string[]) => {
    if (o && typeof o === "object")
      for (const [k, v] of Object.entries(o)) flat(v, k === "DEFAULT" ? path : [...path, k]);
    else {
      const c = color(path.join("-"), o);
      if (c) colors.push(c);
    }
  };
  flat(t.colors, []);
  const type = Object.entries((t.fontSize ?? {}) as Record<string, unknown>).flatMap(
    ([name, v]) => {
      const [s, opts] = Array.isArray(v) ? v : [v];
      const size = toPx(s);
      if (!size) return [];
      const o = (typeof opts === "object" ? opts : { lineHeight: opts }) as Record<string, unknown>;
      const lh = o.lineHeight;
      const n = typeof lh === "string" && /^[\d.]+$/.test(lh) ? Number(lh) : lh;
      const ls =
        typeof o.letterSpacing === "string" ? o.letterSpacing.match(/^(-?[\d.]+)em$/) : null;
      return [
        {
          name,
          size,
          lineHeight: typeof n === "number" ? n : toPx(n) ? toPx(n)! / size : undefined,
          tracking: ls ? Number(ls[1]) : undefined,
          weight: o.fontWeight !== undefined ? Number(o.fontWeight) : undefined,
        },
      ];
    },
  );
  return {
    format: "tailwind",
    colors,
    type,
    radii: dims(t.borderRadius),
    spacing: dims(t.spacing),
    hasDark: false,
  };
}

function parseSystem(text: string): Parsed {
  const f = detect(text);
  if (f === "dtcg") return parseDtcg(text);
  if (f === "tailwind") return parseTailwind(text);
  return f === "design.md" ? parseDesignMd(text) : parseCss(text);
}

// ------------------------------------------------------------------ checks

const TEXT = /(^|-)(text|foreground|fg|ink|content|link|placeholder|on-[\w-]+)(-|$)/i;
/** Text that isn't meant for the page: labels on fills, disabled (exempt in WCAG), inverse. */
const NOT_PAGE_TEXT = /(^on-|-on-|inverse|disabled|white|black|^text-(xs|sm|base|lg|\d?xl))/i;
/** A page-level surface that text sits on. */
const SURFACE =
  /^(bg|background|surface|canvas|paper|page|panel|card|popover|sidebar)(-(subtle|raised|elevated|sunken|alt|alternate|secondary|tertiary|default|base|inset|\d))?$/i;
const NOT_SURFACE =
  /(-(fg|foreground|text|border|ring|hover|active|pressed)|inverse|overlay|scrim)$/i;
const RING = /(^|-)(ring|focus|focus-ring|outline)$/i;
const BRAND = /(primary|accent|brand)(?!.*(fg|foreground|text|on-))/i;

/** Name without the usual prefixes: "color-role-accent" -> "accent". */
const bare = (n: string) => n.replace(/^(color-)?(role-|semantic-|sys-)?/i, "");
const isScaleStep = (n: string) => /-\d{1,3}$/.test(n);
const isOn = (n: string) => /^on-|-(fg|foreground)$/i.test(bare(n));

function byNames<T extends { name: string }>(items: T[], names: string[]): T | undefined {
  for (const n of names) {
    const hit = items.find((i) => bare(i.name).toLowerCase() === n);
    if (hit) return hit;
  }
  return undefined;
}

function pickBg(p: Parsed) {
  const exact = byNames(p.colors, ["bg", "background", "surface", "canvas", "page", "base"]);
  return (
    exact ??
    p.colors.find((c) => SURFACE.test(bare(c.name)) && !NOT_SURFACE.test(bare(c.name))) ??
    p.colors.find((c) => (parseColor(c.hex)?.l ?? 0) > (p.darkOnly ? -1 : 0.95))
  );
}

/** Two decimals, never rounding a failing ratio up to the bar it misses. */
const shown = (r: number, min: number) => {
  const n = Math.round(r * 100) / 100;
  return (r < min && n >= min ? Math.floor(r * 100) / 100 : n).toFixed(2);
};

function checkColor(p: Parsed, findings: Finding[]) {
  const bg = pickBg(p);
  if (!bg) {
    findings.push({
      id: "no-bg",
      area: "Color",
      status: "warn",
      title: "No background color found",
      detail: "Couldn't tell which color is the page background, so text contrast wasn't checked.",
    });
    return dupesAndSprawl(p, findings);
  }
  const by = new Map(p.colors.map((c) => [bare(c.name), c]));
  const surfaces = p.colors.filter(
    (c) => SURFACE.test(bare(c.name)) && !NOT_SURFACE.test(bare(c.name)),
  );
  if (!surfaces.includes(bg)) surfaces.unshift(bg);
  const modes: ("light" | "dark")[] = p.colors.some((c) => c.dark) ? ["light", "dark"] : ["light"];
  const failing: string[] = [];
  const rings: string[] = [];
  const pairs: string[] = [];
  /** Check fg on bg in every theme; text needs 4.5, rings and borders 3. */
  const pair = (fg: Color, on: Color, min: number, into: string[]) => {
    for (const mode of modes) {
      const f = mode === "dark" ? fg.dark : fg.css;
      const b0 = mode === "dark" ? on.dark : on.css;
      if (!f || !b0) continue;
      const page = (mode === "dark" ? bg.dark : bg.css) ?? "#ffffff";
      const b = over(b0, page);
      const r = contrast(over(f, b), b);
      pairs.push(fg.name);
      if (r < min)
        into.push(`${fg.name} on ${on.name}${mode === "dark" ? " (dark)" : ""} ${shown(r, min)}:1`);
    }
  };
  for (const c of p.colors) {
    const b = bare(c.name);
    if (isScaleStep(c.name)) continue;
    // Page text, on every page surface.
    if (TEXT.test(b) && !isOn(c.name) && !NOT_PAGE_TEXT.test(b))
      for (const s of surfaces) if (s !== c) pair(c, s, 4.5, failing);
    // A label on its fill: on-X, X-fg, X-foreground.
    const m = b.match(/^on-(.+)$/) ?? b.match(/^(.+)-(?:fg|foreground)$/);
    const fill = m ? by.get(m[1]!) : undefined;
    if (fill) pair(c, fill, 4.5, failing);
    // Component text on its own background: tooltip-fg / tooltip-muted on tooltip-bg.
    const scoped = b.match(/^(.+)-(fg|text|muted|foreground)$/);
    const own = scoped ? by.get(`${scoped[1]}-bg`) : undefined;
    if (own && own !== fill) pair(c, own, 4.5, failing);
    // Focus rings: 3:1 on the page, or on their own scope (sidebar-ring on sidebar).
    if (RING.test(b)) {
      const scope = b.match(/^(.+)-(?:ring|focus|focus-ring|outline)$/)?.[1];
      const home = scope ? by.get(scope) : undefined;
      pair(c, home ?? bg, 3, rings);
    }
  }
  findings.push(
    failing.length
      ? {
          id: "contrast",
          area: "Color",
          status: "fail",
          title:
            failing.length > 1
              ? `${failing.length} text pairs fail WCAG AA`
              : "1 text pair fails WCAG AA",
          detail: failing.slice(0, 8).join(", ") + (failing.length > 8 ? "…" : ""),
          fix: "Text steps are generated to pass 4.5:1 on every surface, in both themes.",
        }
      : {
          id: "contrast",
          area: "Color",
          status: "pass",
          title: "Text pairs pass WCAG AA",
          detail: `${new Set(pairs).size} colors checked on ${surfaces.map((s) => s.name).join(", ")}${modes.length > 1 ? ", in light and dark" : ""}.`,
        },
  );
  if (rings.length)
    findings.push({
      id: "ring",
      area: "Color",
      status: "fail",
      title: "Focus ring under 3:1",
      detail: rings.slice(0, 6).join(", "),
      fix: "The ring uses a step that passes 3:1 on every surface.",
    });
  dupesAndSprawl(p, findings);
}

const HUE_WORD =
  /(^|-)(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|gray|grey|slate|zinc)(-|$)/i;

function dupesAndSprawl(p: Parsed, findings: Finding[]) {
  // Scale steps and on-colors are excluded: they're meant to be close or white.
  const roles = p.colors.filter((c) => !isScaleStep(c.name) && !isOn(c.name));
  const dupes: string[] = [];
  // OKLab once per color, so the pairwise check stays fast on 400-variable pastes.
  const lab = roles.map((c) => {
    const o = parseColor(c.hex)!;
    const r = (o.h * Math.PI) / 180;
    return [o.l, o.c * Math.cos(r), o.c * Math.sin(r)] as const;
  });
  for (let i = 0; i < roles.length; i++)
    for (let j = i + 1; j < roles.length; j++) {
      const [a, b] = [roles[i]!, roles[j]!];
      const [x, y] = [lab[i]!, lab[j]!];
      if (a.hex !== b.hex && Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 0.005)
        dupes.push(`${a.name} ≈ ${b.name}`);
    }
  if (dupes.length)
    findings.push({
      id: "near-dupes",
      area: "Color",
      status: "warn",
      title: `${dupes.length} near-identical color${dupes.length > 1 ? "s" : ""}`,
      detail: `Indistinguishable side by side: ${dupes.slice(0, 6).join(", ")}. Each one is a choice an agent can get wrong.`,
      fix: "One scale per hue, with a fixed job per step.",
    });
  // A role named for its value ("action-purple") breaks when the brand changes.
  const byValue = roles.filter(
    (c) => HUE_WORD.test(bare(c.name)) && /[a-z]-[a-z]/i.test(bare(c.name)),
  );
  if (byValue.length)
    findings.push({
      id: "value-names",
      area: "Color",
      status: "warn",
      title: "Roles named by their color",
      detail: `${byValue
        .map((c) => c.name)
        .slice(0, 4)
        .join(", ")}: a role says its job, not its hue, so a rebrand doesn't make the name lie.`,
      fix: "Every role is named for its job.",
    });
  const uniq = new Set(roles.map((c) => c.hex)).size;
  if (uniq > 45)
    findings.push({
      id: "sprawl",
      area: "Color",
      status: "warn",
      title: `${uniq} distinct colors`,
      detail:
        "Large palettes are where agents pick the wrong one. Most products need about 20 roles.",
      fix: "About 30 roles over six 12-step scales.",
    });
}

function checkType(p: Parsed, findings: Finding[]) {
  if (!p.type.length) {
    findings.push({
      id: "no-type",
      area: "Type",
      status: "warn",
      title: "No type scale",
      detail: "No font sizes found. Agents will set sizes by hand.",
      fix: "Nine roles from display to caption, each with line height and tracking.",
    });
    return;
  }
  const sizes = [...new Set(p.type.map((t) => Math.round(t.size)))].sort((a, b) => a - b);
  const tiny = p.type.filter((t) => t.size < 12);
  if (tiny.length)
    findings.push({
      id: "tiny",
      area: "Type",
      status: "fail",
      title: "Text under 12px",
      detail: tiny.map((t) => `${t.name} ${t.size}px`).join(", "),
      fix: "Nothing below 12px.",
    });
  if (sizes.length >= 4) {
    const ratios = sizes.slice(1).map((s, i) => s / sizes[i]!);
    // The jump up to display is usually a deliberate leap; judge the rest.
    const logs = ratios.slice(0, -1).map(Math.log);
    const mean = logs.reduce((a, b) => a + b, 0) / logs.length;
    const cv = Math.sqrt(logs.reduce((a, b) => a + (b - mean) ** 2, 0) / logs.length) / mean;
    const tooClose = ratios.filter((r) => r < 1.08).length;
    findings.push(
      cv > 0.45 || tooClose > 0
        ? {
            id: "scale",
            area: "Type",
            status: "warn",
            title: "Sizes don't follow a scale",
            detail: `Steps between sizes range from ×${Math.min(...ratios).toFixed(2)} to ×${Math.max(...ratios).toFixed(2)}${tooClose ? `; ${tooClose === 1 ? "one pair is" : `${tooClose} pairs are`} too close to tell apart` : ""}. Sizes: ${sizes.join(", ")}px.`,
            fix: "One ratio, applied to roles.",
          }
        : {
            id: "scale",
            area: "Type",
            status: "pass",
            title: "Sizes follow a consistent scale",
            detail: `About ×${Math.exp(mean).toFixed(2)} per step: ${sizes.join(", ")}px.`,
          },
    );
  }
  const noLh = p.type.filter((t) => t.lineHeight === undefined);
  if (noLh.length)
    findings.push({
      id: "no-lh",
      area: "Type",
      status: "warn",
      title:
        noLh.length > 1
          ? `${noLh.length} sizes without a line height`
          : "1 size without a line height",
      detail: "Line height left to the browser default (about 1.2) is too tight for body text.",
      fix: "Line height per role, on a 4px grid.",
    });
  // Wrapped text needs room between lines; headings are judged separately below.
  const tight = p.type.filter(
    (t) => t.size < 24 && t.lineHeight !== undefined && t.lineHeight < 1.35,
  );
  if (tight.length)
    findings.push({
      id: "tight",
      area: "Type",
      status: "warn",
      title: "Text line height too tight",
      detail:
        tight
          .map((t) => `${t.name} ${t.size}px at ${Math.round(t.lineHeight! * 100) / 100}`)
          .join(", ") + ". Text that wraps needs about 1.4 or more.",
      fix: "Line height per role, on a 4px grid.",
    });
  const thin = p.type.filter((t) => t.size < 24 && t.weight !== undefined && t.weight < 400);
  if (thin.length)
    findings.push({
      id: "thin",
      area: "Type",
      status: "warn",
      title: "Light weight at small size",
      detail: `${thin.map((t) => `${t.name} ${t.size}px at ${t.weight}`).join(", ")}. Under 400, small text loses its strokes on low-density screens.`,
      fix: "400 or heavier below display sizes.",
    });
  const loose = p.type.filter((t) => t.size >= 28 && (t.lineHeight ?? 0) > 1.35);
  if (loose.length)
    findings.push({
      id: "loose-headings",
      area: "Type",
      status: "warn",
      title: "Headings use body line height",
      detail:
        loose.map((t) => `${t.name} ${t.size}px at ${t.lineHeight}`).join(", ") +
        ". Large text needs 1.1–1.25.",
      fix: "Line height falls as size grows.",
    });
  const flat = p.type.filter((t) => t.size >= 28 && !t.tracking);
  if (flat.length)
    findings.push({
      id: "tracking",
      area: "Type",
      status: "warn",
      title: "Large text has default tracking",
      detail: `${flat.map((t) => t.name).join(", ")}: big sizes look loose without negative tracking.`,
      fix: "Tracking tightens with size (Inter's dynamic metrics).",
    });
  const body = pickBody(p);
  const fam = body?.family?.split(",")[0]?.replace(/["']/g, "").trim();
  if (body && fam && (FONT_NAMES as string[]).includes(fam)) {
    const ob = opticalBase(fam as FontName);
    // What this size looks like in Inter terms. 14 to 17 covers dense apps to roomy sites.
    const looks = Math.round(((body.size * 16) / ob) * 2) / 2;
    if (looks < 13.5 || looks > 17.5)
      findings.push({
        id: "optical",
        area: "Type",
        status: "warn",
        title: `${fam} at ${body.size}px reads ${looks < 14 ? "small" : "large"}`,
        detail: `Its x-height is ${ob > 16 ? "short" : "tall"}: at ${body.size}px it looks like Inter at ${looks}px. ${ob}px matches Inter at 16px.`,
        fix: "Body size suggested from the font's x-height.",
      });
  }
}

function checkShapeSpace(p: Parsed, findings: Finding[]) {
  const radii = [...new Set(p.radii.map((r) => r.px).filter((r) => r < 999))];
  if (radii.length > 6)
    findings.push({
      id: "radii",
      area: "Shape",
      status: "warn",
      title: `${radii.length} different radii`,
      detail: `${radii.sort((a, b) => a - b).join(", ")}px. More than five makes nesting inconsistent.`,
      fix: "Five radii from one roundness dial.",
    });
  const off = p.spacing.filter((s) => s.px > 1 && s.px % 2 !== 0);
  if (off.length)
    findings.push({
      id: "grid",
      area: "Space",
      status: "warn",
      title:
        off.length > 1
          ? `${off.length} spacing values off the grid`
          : "1 spacing value off the grid",
      detail: off
        .slice(0, 6)
        .map((s) => `${s.name} ${s.px}px`)
        .join(", "),
      fix: "Everything on a 4px grid.",
    });
  if (!p.spacing.length)
    findings.push({
      id: "no-space",
      area: "Space",
      status: "warn",
      title: "No spacing scale",
      detail: "Agents will invent padding and gaps.",
      fix: "A 4px scale plus control heights.",
    });
}

function checkCoverage(p: Parsed, findings: Finding[]) {
  const names = p.colors.map((c) => c.name).join(" ");
  const missing: string[] = [];
  if (!/(ring|focus|outline)/i.test(names)) missing.push("focus ring");
  if (!/(error|danger|destructive|critical)/i.test(names)) missing.push("error");
  if (
    !/(muted|faint|variant|secondary-text|subtle-text|text-2|tertiary|text-(light|soft|secondary|subtle))/i.test(
      names,
    )
  )
    missing.push("muted text");
  if (!/(border|stroke|outline|divider|line)/i.test(names)) missing.push("border");
  if (missing.length)
    findings.push({
      id: "roles",
      area: "Coverage",
      status: "warn",
      title: `Missing roles: ${missing.join(", ")}`,
      detail: "When a role is missing, agents improvise one, and each improvises differently.",
      fix: "Every role a product needs, named for its job.",
    });
  if (!p.hasDark)
    findings.push({
      id: "dark",
      area: "Coverage",
      status: "warn",
      title: "No dark theme",
      detail:
        "Agents asked for dark mode will invert colors, which breaks contrast and saturation.",
      fix: "Dark scales generated for dark backgrounds.",
    });
}

function pickBody(p: Parsed) {
  return (
    byNames(p.type, [
      "body",
      "body-md",
      "text-body",
      "text-base",
      "base",
      "paragraph",
      "body-medium",
      "text-md",
    ]) ??
    p.type.find((t) => /body|paragraph/i.test(t.name) && t.size >= 14 && t.size <= 18) ??
    p.type.find((t) => t.size >= 14 && t.size <= 18)
  );
}

// ------------------------------------------------------------------ inference

function inferInput(p: Parsed): SystemInput {
  const brand =
    byNames(p.colors, [
      "accent",
      "primary",
      "brand",
      "accent-9",
      "primary-9",
      "brand-9",
      "primary-500",
      "brand-500",
    ]) ??
    p.colors.find((c) => BRAND.test(c.name) && !isScaleStep(c.name) && !isOn(c.name)) ??
    [...p.colors].sort((a, b) => (parseColor(b.hex)?.c ?? 0) - (parseColor(a.hex)?.c ?? 0))[0];
  const bc = brand ? parseColor(brand.hex) : null;
  const text = byNames(p.colors, [
    "text",
    "foreground",
    "on-surface",
    "on-background",
    "ink",
    "text-primary",
  ]);
  const ink = text ? parseColor(text.hex) : null;
  const famOf = (t?: Parsed["type"][number]) => {
    const f = t?.family?.split(",")[0]?.replace(/["']/g, "").trim();
    return f && (FONT_NAMES as string[]).includes(f) ? (f as FontName) : undefined;
  };
  const sorted = [...p.type].sort((a, b) => a.size - b.size);
  const body = pickBody(p);
  const largest = sorted[sorted.length - 1];
  const base = body ? Math.round(body.size) : 16;
  // Infer ratio from the largest heading assuming it sits near h1 (4 steps up).
  const h1 = p.type.find((t) => /h1|headline-lg|title-lg|heading-1/i.test(t.name)) ?? largest;
  const ratio =
    h1 && h1.size > base ? Math.min(1.5, Math.max(1.125, (h1.size / base) ** (1 / 4))) : 1.25;
  const radii = p.radii
    .map((r) => r.px)
    .filter((r) => r > 0 && r < 999)
    .sort((a, b) => a - b);
  const mid =
    byNames(p.radii, ["md", "radius-md", "default", "base", "radius"])?.px ??
    radii[Math.floor(radii.length / 2)];
  const heading = famOf(p.type.find((t) => /h\d|head|display|title/i.test(t.name)));
  const bodyFont = famOf(body);
  return {
    ...DEFAULT_INPUT,
    name: p.name ?? "Audited system",
    accent: bc
      ? {
          hue: Math.round(bc.h || 0),
          chroma: Math.max(0.02, Math.min(0.3, bc.c)),
          solidL: Math.min(0.9, Math.max(0.3, bc.l)),
        }
      : DEFAULT_INPUT.accent,
    // Invert buildNeutral from the text color (step 12 carries half the neutral's
    // peak chroma); near-white backgrounds lose too much chroma to hex rounding.
    neutralTint: ink
      ? Math.round(Math.min(1, Math.max(0, (ink.c / 0.5 - 0.004) / 0.026)) * 100) / 100
      : DEFAULT_INPUT.neutralTint,
    type: {
      ...DEFAULT_INPUT.type,
      body: bodyFont ?? DEFAULT_INPUT.type.body,
      heading: heading ?? bodyFont ?? DEFAULT_INPUT.type.heading,
      base: Math.min(18, Math.max(14, base)),
      ratio: Math.round(ratio * 1000) / 1000,
    },
    roundness: mid !== undefined ? Math.min(1, mid / 16) : DEFAULT_INPUT.roundness,
  };
}

export function audit(text: string): Report {
  const parsed = parseSystem(text);
  if (!parsed.colors.length && !parsed.type.length && !parsed.spacing.length)
    throw new Error(
      "Found no colors, sizes or spacing. Paste DESIGN.md, tokens.json, CSS variables or a Tailwind config.",
    );
  const findings: Finding[] = [];
  checkColor(parsed, findings);
  checkType(parsed, findings);
  checkShapeSpace(parsed, findings);
  checkCoverage(parsed, findings);
  const fails = findings.filter((f) => f.status === "fail").length;
  const warns = findings.filter((f) => f.status === "warn").length;
  const score = Math.max(0, 100 - fails * 20 - warns * 7);
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
  const order: Record<Status, number> = { fail: 0, warn: 1, pass: 2 };
  findings.sort((a, b) => order[a.status] - order[b.status]);
  return { parsed, findings, score, grade, input: inferInput(parsed) };
}

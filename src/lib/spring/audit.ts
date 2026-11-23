/**
 * Audit: read a design system someone (or some agent) already made, from a
 * DESIGN.md, a DTCG tokens.json or plain CSS variables, and report what's
 * broken. Then infer the closest Spring input so "fix all" can rebuild it.
 */
import { parseYaml } from "./yaml";
import { contrast, distance, parseColor } from "./color";
import { FONT_NAMES, opticalBase, type FontName } from "./type";
import { DEFAULT_INPUT, type SystemInput } from "./system";
import { oklchToHex } from "./colormath";

type Format = "design.md" | "dtcg" | "css";

interface Parsed {
  format: Format;
  name?: string;
  colors: { name: string; hex: string; dark?: string }[];
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
}

type Status = "pass" | "warn" | "fail";

export interface Finding {
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

const hexOf = (v: unknown): string | undefined => {
  if (typeof v === "string") {
    const c = parseColor(v);
    return c ? oklchToHex(c) : undefined;
  }
  if (v && typeof v === "object") {
    const o = v as { hex?: string; colorSpace?: string; components?: number[] };
    if (o.hex) return hexOf(o.hex);
    if (o.colorSpace && o.components) {
      const [a, b, c] = o.components;
      if (o.colorSpace === "oklch") return hexOf(`oklch(${a} ${b} ${c})`);
      if (o.colorSpace === "srgb") return hexOf(`rgb(${a! * 255} ${b! * 255} ${c! * 255})`);
    }
  }
  return undefined;
};

function detect(text: string): Format {
  const t = text.trimStart();
  if (t.startsWith("{")) return "dtcg";
  if (t.startsWith("---") || /^#\s/m.test(t)) return "design.md";
  return "css";
}

const dims = (o: unknown) =>
  Object.entries((o ?? {}) as Record<string, unknown>)
    .map(([name, v]) => ({ name, px: toPx(v) }))
    .filter((d): d is { name: string; px: number } => d.px !== undefined);

function parseDesignMd(text: string): Parsed {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const y = (m ? parseYaml(m[1]!) : {}) as Record<string, unknown>;
  const colors = Object.entries((y.colors ?? {}) as Record<string, unknown>)
    .map(([name, v]) => ({ name, hex: hexOf(v) }))
    .filter((c): c is { name: string; hex: string } => !!c.hex);
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

function parseDtcg(text: string): Parsed {
  const root = JSON.parse(text) as Record<string, unknown>;
  const out: Parsed = {
    format: "dtcg",
    colors: [],
    type: [],
    radii: [],
    spacing: [],
    hasDark: false,
  };
  const all = new Map<string, unknown>();
  const walk = (node: unknown, path: string[], inherited?: string) => {
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    const type = (o.$type as string) ?? inherited;
    if ("$value" in o) {
      all.set(path.join("."), o.$value);
      const name = path.join("-");
      let v = o.$value;
      // Follow alias chains ({a} -> {b} -> value), not just one hop.
      for (let hop = 0; hop < 10 && typeof v === "string" && /^\{.+\}$/.test(v); hop++) {
        const next = all.get(v.slice(1, -1));
        if (next === undefined) break;
        v = next;
      }
      const ext = (o.$extensions as Record<string, unknown> | undefined)?.mode as
        | Record<string, unknown>
        | undefined;
      if (ext?.dark) out.hasDark = true;
      if (type === "color") {
        const hex = hexOf(v);
        if (hex) out.colors.push({ name, hex, dark: ext?.dark ? hexOf(ext.dark) : undefined });
      } else if (type === "typography" && v && typeof v === "object") {
        const t = v as Record<string, unknown>;
        const size = toPx(t.fontSize);
        if (size)
          out.type.push({
            name,
            size,
            lineHeight: typeof t.lineHeight === "number" ? t.lineHeight : undefined,
            tracking:
              (t.letterSpacing as { value?: number; unit?: string })?.unit === "em"
                ? (t.letterSpacing as { value: number }).value
                : undefined,
            weight: typeof t.fontWeight === "number" ? t.fontWeight : undefined,
            family:
              typeof t.fontFamily === "string" && !t.fontFamily.startsWith("{")
                ? t.fontFamily
                : undefined,
          });
      } else if (type === "dimension") {
        const px = toPx(v);
        if (px !== undefined)
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

function parseCss(text: string): Parsed {
  const out: Parsed = {
    format: "css",
    colors: [],
    type: [],
    radii: [],
    spacing: [],
    hasDark: /prefers-color-scheme:\s*dark|data-theme=["']?dark|\.dark\b/i.test(text),
  };
  const vars = new Map<string, string>();
  // Only the first (light/root) definition of each variable counts.
  for (const m of text.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g))
    if (!vars.has(m[1]!)) vars.set(m[1]!, m[2]!.trim());
  const resolve = (v: string, depth = 0): string => {
    const ref = v.match(/^var\(--([\w-]+)\)$/);
    return ref && depth < 5 && vars.has(ref[1]!) ? resolve(vars.get(ref[1]!)!, depth + 1) : v;
  };
  for (const [name, raw] of vars) {
    const v = resolve(raw);
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
      !/(line-height|letter-spacing|weight|color)/i.test(name)
    ) {
      const px = toPx(v);
      if (px !== undefined) {
        const lh = vars.get(`${name}--line-height`) ?? vars.get(`${name}-line-height`);
        const tr = (
          vars.get(`${name}--letter-spacing`) ?? vars.get(`${name}-letter-spacing`)
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
    const hex = hexOf(v);
    if (hex) out.colors.push({ name, hex });
  }
  return out;
}

function parseSystem(text: string): Parsed {
  const f = detect(text);
  return f === "dtcg" ? parseDtcg(text) : f === "design.md" ? parseDesignMd(text) : parseCss(text);
}

// ------------------------------------------------------------------ checks

const TEXT = /(^|-)(text|foreground|fg|ink|content|on-[\w-]+)(-|$)/i;
const BG = /(^|-)(bg|background|surface|canvas|base|paper|neutral|page)(-|$)/i;
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
  const exact = byNames(p.colors, [
    "bg",
    "background",
    "surface",
    "neutral",
    "canvas",
    "page",
    "base",
  ]);
  return (
    exact ??
    p.colors.find((c) => BG.test(c.name)) ??
    p.colors.find((c) => (parseColor(c.hex)?.l ?? 0) > 0.95)
  );
}

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
  } else {
    const failing: string[] = [];
    for (const c of p.colors) {
      if (!TEXT.test(bare(c.name)) || isOn(c.name) || isScaleStep(c.name)) continue;
      const r = contrast(c.hex, bg.hex);
      if (r < 4.5) failing.push(`${c.name} ${r.toFixed(2)}:1`);
      // DTCG dark values from $extensions.mode.dark get the same check on the dark background.
      if (c.dark && bg.dark) {
        const d = contrast(c.dark, bg.dark);
        if (d < 4.5) failing.push(`${c.name} (dark) ${d.toFixed(2)}:1`);
      }
    }
    // on-X pairs
    for (const c of p.colors) {
      const b = bare(c.name);
      const m = b.match(/^on-(.+)$/) ?? b.match(/^(.+)-(?:fg|foreground)$/);
      if (!m) continue;
      const base = p.colors.find((x) => bare(x.name) === m[1]);
      if (!base) continue;
      const r = contrast(c.hex, base.hex);
      if (r < 4.5) failing.push(`${c.name} on ${base.name} ${r.toFixed(2)}:1`);
      if (c.dark && base.dark) {
        const d = contrast(c.dark, base.dark);
        if (d < 4.5) failing.push(`${c.name} on ${base.name} (dark) ${d.toFixed(2)}:1`);
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
            detail: `Checked against ${bg.name} and every on-color pair.`,
          },
    );
  }
  // Scale steps and on-colors are excluded: they're meant to be close or white.
  const roles = p.colors.filter((c) => !isScaleStep(c.name) && !isOn(c.name));
  const dupes: string[] = [];
  for (let i = 0; i < roles.length; i++)
    for (let j = i + 1; j < roles.length; j++) {
      const a = roles[i]!;
      const b = roles[j]!;
      if (a.hex !== b.hex && distance(a.hex, b.hex) < 0.005) dupes.push(`${a.name} ≈ ${b.name}`);
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
    !/(muted|secondary-text|subtle-text|text-2|tertiary|text-(light|soft|faint|secondary|subtle))/i.test(
      names,
    )
  )
    missing.push("muted text");
  if (!/(border|stroke|outline|divider)/i.test(names)) missing.push("border");
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

/**
 * Read the design system a project already has, from the files that define
 * it (CSS custom properties incl. Tailwind v4 @theme, DTCG or Style Dictionary
 * JSON, a Tailwind v3 config, DESIGN.md), into one flat shape: Spring View v1.
 * Nothing is dropped: tokens Spring can't classify are kept and shown raw.
 *
 * Shared by the /spring/view page (dropped files) and the CLI the agent skill
 * runs (a repo on disk), so both read a project the same way.
 */
import { parseYaml } from "./yaml";
import { parseCss as parseColorCss } from "./colormath";
import { namedColor } from "./css-names";

export const VIEW_SCHEMA_URL = "https://someshks.com/spring/view.schema.json";

export interface Hit {
  /** What was found, as written (a color literal or a class). */
  value: string;
  /** path:line */
  at: string;
}

/** How the code uses the tokens. Only the CLI fills it: the page can't see the code. */
export interface Usage {
  files: number;
  /** References per token name: var(--x) and Tailwind classes that map to it. */
  refs: Record<string, number>;
  /** Color literals outside token definitions. */
  raw: Hit[];
  rawCount: number;
  /** Tailwind default-palette or arbitrary-value color classes the system doesn't define. */
  offSystem: Hit[];
  offSystemCount: number;
}

export interface View {
  $schema?: string;
  v: 1;
  name?: string;
  /** Theme names; the first is the default, which other modes fall back to. */
  modes: string[];
  /** Token name (no leading --) → mode → raw CSS value. var() references allowed. */
  tokens: Record<string, Record<string, string>>;
  /** Custom properties set on components rather than themes, kept apart. */
  scoped?: { selector: string; count: number }[];
  sources: string[];
  usage?: Usage;
  notes?: string[];
}

export interface SourceFile {
  path: string;
  text: string;
}

export const MAX_TOKENS = 3000;
const MAX_SCOPED = 40;
export const MAX_MODES = 8;

// ------------------------------------------------------------------ CSS

/** Blocks that aren't a theme: high contrast, forced colors, print, reduced motion. */
const SKIP = /prefers-contrast|forced-colors|\bprint\b|prefers-reduced/i;
const NOT = /:not\((?:[^()]|\([^()]*\))*\)/g;
const DARK_SEL =
  /prefers-color-scheme:\s*dark|\.dark\b|\[data-(?:theme|mode|color-scheme|bs-theme)\s*=\s*["']?dark|\.theme-dark\b|\.dark-theme\b|\.dark-mode\b/i;
const ROOTISH = /^(:root|html|body|:host|@theme(\s+(inline|static|reference))*|\*|::?backdrop)$/i;

/**
 * The theme a rule's context sets values for: a mode name, or a selector
 * when it's a component scope. `light` is the default mode.
 */
function themeOf(ctx: string[]): { mode: string } | { scoped: string } | null {
  const plain = ctx.map((c) => c.replace(NOT, "").trim());
  if (plain.some((c) => SKIP.test(c))) return null;
  if (plain.some((c) => DARK_SEL.test(c))) return { mode: "dark" };
  const sel = plain.toReversed().find((c) => !/^@(media|supports|layer|container)\b/i.test(c));
  if (sel === undefined) return { mode: "light" };
  const parts = sel.split(",").map((s) => s.trim());
  for (const p of parts) {
    const m =
      p.match(/\[data-(?:theme|mode|color-scheme|bs-theme)\s*=\s*["']?([\w-]+)/i) ??
      p.match(/^(?:html|:root|body)?\.theme-([\w-]+)$/i);
    if (m) return { mode: m[1]!.toLowerCase() === "light" ? "light" : m[1]!.toLowerCase() };
    if (/^(?:html|:root)?\.light$/i.test(p)) return { mode: "light" };
  }
  if (parts.some((p) => ROOTISH.test(p))) return { mode: "light" };
  return { scoped: sel };
}

interface Acc {
  modes: Set<string>;
  tokens: Map<string, Map<string, string>>;
  scoped: Map<string, number>;
  notes: string[];
}

const put = (acc: Acc, name: string, mode: string, value: string) => {
  if (name === "__proto__") return;
  if (!acc.tokens.has(name)) {
    if (acc.tokens.size >= MAX_TOKENS) return;
    acc.tokens.set(name, new Map());
  }
  acc.modes.add(mode);
  acc.tokens.get(name)!.set(mode, value.trim());
};

function readCss(text: string, acc: Acc) {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const stack: string[] = [];
  let buf = "";
  let quote = "";
  let schemeDark = false;
  const before = acc.tokens.size;
  const local: [string, string, string][] = [];
  const take = () => {
    const m = buf.match(/^\s*--([\w-]+)\s*:([\s\S]*)$/);
    if (m) {
      const t = themeOf(stack);
      if (t && "mode" in t) local.push([m[1]!, t.mode, m[2]!.replace(/\s*!important\s*$/, "")]);
      else if (t) acc.scoped.set(t.scoped, (acc.scoped.get(t.scoped) ?? 0) + 1);
    } else if (/^\s*color-scheme\s*:\s*dark\s*$/i.test(buf) && !stack.some((c) => DARK_SEL.test(c)))
      schemeDark = true;
    buf = "";
  };
  let depth = 0; // parens, so ; and { inside url() or a value don't split it
  for (const ch of src) {
    if (quote) {
      buf += ch;
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
    } else if (ch === "(") {
      depth++;
      buf += ch;
    } else if (ch === ")") {
      depth = Math.max(0, depth - 1);
      buf += ch;
    } else if (depth) buf += ch;
    else if (ch === "{") {
      stack.push(buf.trim());
      buf = "";
    } else if (ch === "}") {
      take();
      stack.pop();
    } else if (ch === ";") take();
    else buf += ch;
  }
  take();
  // A file that only declares a dark scheme and no dark block is a dark-only theme.
  const darkOnly = schemeDark && !local.some(([, m]) => m === "dark");
  for (const [n, m, v] of local) put(acc, n, darkOnly && m === "light" ? "dark" : m, v);
  return acc.tokens.size - before;
}

// ------------------------------------------------------------------ DTCG / Style Dictionary

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const kebab = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^\w-]+/g, "-")
    .toLowerCase();
// Style Dictionary's own refs end in .value ({color.base.red.value}); the token is the path before it.
const refName = (path: string) =>
  path
    .replace(/\.\$?value$/, "")
    .split(".")
    .map(kebab)
    .join("-");
/** {a.b} references become var(--a-b) so the same resolver handles every format. */
const refs = (s: string) => s.replace(/\{([^{}]+)\}/g, (_, p: string) => `var(--${refName(p)})`);

const unit = (v: unknown): string | undefined => {
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return refs(v);
  if (isObj(v) && typeof v.value === "number") return `${v.value}${(v.unit as string) ?? ""}`;
  return undefined;
};

/** A DTCG $value as CSS, or undefined for shapes that don't have one. */
function dtcgCss(v: unknown, type?: string): string | undefined {
  if (typeof v === "string") return refs(v);
  if (typeof v === "number") return type === "duration" ? `${v}ms` : String(v);
  if (Array.isArray(v)) {
    if (type === "cubicBezier" && v.length === 4) return `cubic-bezier(${v.join(", ")})`;
    if (type === "shadow" || v.every(isObj)) return v.map((x) => dtcgCss(x, "shadow")).join(", ");
    return v.map((x) => (typeof x === "string" && /\s/.test(x) ? `"${x}"` : String(x))).join(", ");
  }
  if (!isObj(v)) return undefined;
  if (typeof v.colorSpace === "string" && Array.isArray(v.components)) {
    const [x, y, z] = v.components as number[];
    const a = typeof v.alpha === "number" && v.alpha < 1 ? ` / ${v.alpha}` : "";
    if (v.colorSpace === "oklch") return `oklch(${x} ${y} ${z}${a})`;
    if (v.colorSpace === "srgb") return `color(srgb ${x} ${y} ${z}${a})`;
    if (typeof v.hex === "string") return v.hex;
    return `color(${v.colorSpace} ${x} ${y} ${z}${a})`;
  }
  if ("value" in v && "unit" in v) return unit(v);
  if (type === "shadow" || "offsetX" in v || "blur" in v) {
    const parts = [v.inset ? "inset" : "", unit(v.offsetX) ?? "0", unit(v.offsetY) ?? "0"];
    parts.push(unit(v.blur) ?? "0", unit(v.spread) ?? "0", dtcgCss(v.color, "color") ?? "");
    return parts.filter(Boolean).join(" ");
  }
  return undefined;
}

const TYPO_KEYS: Record<string, string> = {
  fontFamily: "font-family",
  fontSize: "font-size",
  fontWeight: "font-weight",
  lineHeight: "line-height",
  letterSpacing: "letter-spacing",
};

function readJson(text: string, path: string, acc: Acc) {
  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch (e) {
    acc.notes.push(`${path}: not valid JSON (${(e as Error).message}); skipped.`);
    return 0;
  }
  const before = acc.tokens.size;
  // A file named for a theme ("tokens.dark.json", "dark/colors.json") holds that theme's values.
  const fileMode = /(^|[\W_])dark([\W_]|$)/i.test(path) ? "dark" : "light";
  const walk = (node: unknown, trail: string[], inherited?: string) => {
    if (!isObj(node)) return;
    const type = (typeof node.$type === "string" ? node.$type : undefined) ?? inherited;
    const has$ = "$value" in node;
    // Style Dictionary's older format: { value, type } without the $.
    const legacy = !has$ && "value" in node && !isObj(node.value) && trail.length > 0;
    if (has$ || legacy) {
      const value = has$ ? node.$value : node.value;
      const t = type ?? (typeof node.type === "string" ? node.type : undefined);
      const name = trail.map(kebab).join("-");
      const set = (n: string, v: unknown, mode = fileMode) => {
        const css = dtcgCss(v, t);
        if (css !== undefined) put(acc, n, mode, css);
      };
      if (t === "typography" && isObj(value)) {
        for (const [k, x] of Object.entries(value))
          set(`${name}-${TYPO_KEYS[k] ?? kebab(k)}`, x, fileMode);
      } else set(name, value);
      // Modes some tools keep in extensions: { mode: { dark: … } } or Tokens Studio's themes.
      const ext = isObj(node.$extensions) ? node.$extensions : undefined;
      const modes = ext && (isObj(ext.mode) ? ext.mode : isObj(ext.modes) ? ext.modes : undefined);
      if (modes) for (const [m, x] of Object.entries(modes)) set(name, x, kebab(m));
      return;
    }
    for (const [k, child] of Object.entries(node))
      if (!k.startsWith("$")) walk(child, [...trail, k], type);
  };
  walk(root, []);
  return acc.tokens.size - before;
}

// ------------------------------------------------------------------ Tailwind v3 config

/** Theme keys and the Tailwind v4 namespace each maps to, so every format lands on one naming. */
const TW_NS: Record<string, string> = {
  colors: "color",
  fontFamily: "font",
  fontSize: "text",
  fontWeight: "font-weight",
  lineHeight: "leading",
  letterSpacing: "tracking",
  spacing: "spacing",
  borderRadius: "radius",
  boxShadow: "shadow",
  transitionDuration: "duration",
  transitionTimingFunction: "ease",
  screens: "breakpoint",
  zIndex: "z",
  opacity: "opacity",
};

/** A Tailwind config's theme, read as data: functions, imports and spreads can't be. */
function readTailwind(text: string, path: string, acc: Acc) {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");
  const at = src.search(/\btheme\s*:\s*\{/);
  if (at < 0) {
    acc.notes.push(`${path}: no theme object; Tailwind defaults only.`);
    return 0;
  }
  const start = src.indexOf("{", at);
  let depth = 0;
  let end = start;
  for (; end < src.length; end++) {
    if (src[end] === "{") depth++;
    else if (src[end] === "}" && --depth === 0) break;
  }
  const json = src
    .slice(start, end + 1)
    .replace(/`([^`\\$]*)`/g, (_, s: string) => JSON.stringify(s))
    .replace(/'([^'\\]*)'/g, (_, s: string) => JSON.stringify(s))
    .replace(/([{,]\s*)([\w$-]+)\s*:/g, '$1"$2":')
    .replace(/,(\s*[}\]])/g, "$1");
  let theme: Obj;
  try {
    theme = JSON.parse(json) as Obj;
  } catch {
    acc.notes.push(
      `${path}: the theme uses code (functions, imports or spreads), so it can't be read without running it. Values set there are missing.`,
    );
    return 0;
  }
  const before = acc.tokens.size;
  const t: Obj = { ...theme, ...(isObj(theme.extend) ? theme.extend : {}) };
  for (const [key, ns] of Object.entries(TW_NS)) {
    const flat = (o: unknown, trail: string[]) => {
      if (isObj(o)) {
        for (const [k, v] of Object.entries(o)) flat(v, k === "DEFAULT" ? trail : [...trail, k]);
        return;
      }
      const name = [ns, ...trail].join("-");
      if (key === "fontSize" && Array.isArray(o)) {
        const [size, opts] = o as [unknown, unknown];
        if (typeof size === "string") put(acc, name, "light", size);
        const lh = typeof opts === "string" ? opts : isObj(opts) ? opts.lineHeight : undefined;
        if (typeof lh === "string" || typeof lh === "number")
          put(acc, `${name}--line-height`, "light", String(lh));
        if (isObj(opts) && typeof opts.letterSpacing === "string")
          put(acc, `${name}--letter-spacing`, "light", opts.letterSpacing);
        return;
      }
      if (Array.isArray(o))
        put(acc, name, "light", o.map((x) => (/\s/.test(String(x)) ? `"${x}"` : x)).join(", "));
      else if (typeof o === "string" || typeof o === "number") put(acc, name, "light", String(o));
    };
    flat(t[key], []);
  }
  return acc.tokens.size - before;
}

// ------------------------------------------------------------------ DESIGN.md

function readDesignMd(text: string, acc: Acc) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return 0;
  const y = parseYaml(m[1]!) as Obj;
  const before = acc.tokens.size;
  const each = (o: unknown, ns: string) => {
    if (isObj(o))
      for (const [k, v] of Object.entries(o))
        if (typeof v === "string" || typeof v === "number")
          put(acc, `${ns}-${kebab(k)}`, "light", String(v));
  };
  each(y.colors, "color");
  each(y.rounded, "radius");
  each(y.spacing, "spacing");
  if (isObj(y.typography))
    for (const [role, t] of Object.entries(y.typography)) {
      if (!isObj(t)) continue;
      const r = kebab(role);
      if (t.fontSize !== undefined) put(acc, `text-${r}`, "light", String(t.fontSize));
      if (t.lineHeight !== undefined)
        put(acc, `text-${r}--line-height`, "light", String(t.lineHeight));
      if (t.letterSpacing !== undefined)
        put(acc, `text-${r}--letter-spacing`, "light", String(t.letterSpacing));
      if (t.fontWeight !== undefined)
        put(acc, `text-${r}--font-weight`, "light", String(t.fontWeight));
      if (typeof t.fontFamily === "string") put(acc, `font-${r}`, "light", t.fontFamily);
    }
  if (typeof y.name === "string") acc.notes.push(`name:${y.name}`);
  return acc.tokens.size - before;
}

// ------------------------------------------------------------------ entry

export type SourceKind = "css" | "json" | "tailwind" | "design.md";

export function kindOf(path: string, text: string): SourceKind | null {
  const p = path.toLowerCase();
  if (/tailwind\.config\.(js|cjs|mjs|ts|cts|mts)$/.test(p)) return "tailwind";
  if (/(^|\/)design\.md$/.test(p)) return "design.md";
  if (/\.(css|scss|sass|less|pcss|postcss)$/.test(p)) return "css";
  if (p.endsWith(".json")) return /"\$?value"\s*:/.test(text) ? "json" : null;
  // Pasted text with no name: sniff it.
  const t = text.trimStart();
  if (t.startsWith("{")) return "json";
  if (t.startsWith("---")) return "design.md";
  if (/\btheme\s*:\s*\{/.test(t) && !/--[\w-]+\s*:/.test(t)) return "tailwind";
  return /--[\w-]+\s*:/.test(t) ? "css" : null;
}

/** Files in, one View out. Later files win on the same token and mode, like a cascade. */
export function extract(files: SourceFile[], name?: string): View {
  const acc: Acc = { modes: new Set(), tokens: new Map(), scoped: new Map(), notes: [] };
  const sources: string[] = [];
  for (const f of files) {
    const k = kindOf(f.path, f.text);
    if (!k) continue;
    const n =
      k === "css"
        ? readCss(f.text, acc)
        : k === "json"
          ? readJson(f.text, f.path, acc)
          : k === "tailwind"
            ? readTailwind(f.text, f.path, acc)
            : readDesignMd(f.text, acc);
    const touched = n > 0 || (k === "css" && /--[\w-]+\s*:/.test(f.text));
    if (touched) sources.push(f.path);
  }
  if (acc.tokens.size >= MAX_TOKENS)
    acc.notes.push(`Stopped at ${MAX_TOKENS} tokens; the rest were left out.`);
  const named = acc.notes.find((n) => n.startsWith("name:"));
  const notes = acc.notes.filter((n) => !n.startsWith("name:"));
  // Light first, dark second, the rest as found.
  const found = [...acc.modes].sort((a, b) => rank(a) - rank(b));
  const modes = found.slice(0, MAX_MODES);
  if (found.length > MAX_MODES)
    notes.push(
      `${found.length} themes found; kept ${modes.join(", ")}. Left out: ${found.slice(MAX_MODES).join(", ")}.`,
    );
  if (!modes.length) modes.push("light");
  const kept = new Set(modes);
  const tokens: View["tokens"] = {};
  for (const [k, m] of acc.tokens)
    Object.defineProperty(tokens, k, {
      value: Object.fromEntries([...m].filter(([mode]) => kept.has(mode))),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  const scoped = [...acc.scoped]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_SCOPED)
    .map(([selector, count]) => ({ selector, count }));
  return {
    $schema: VIEW_SCHEMA_URL,
    v: 1,
    ...((name ?? named) ? { name: name ?? named!.slice(5) } : {}),
    modes,
    tokens,
    ...(scoped.length ? { scoped } : {}),
    sources,
    ...(notes.length ? { notes } : {}),
  };
}
const rank = (m: string) => (m === "light" ? 0 : m === "dark" ? 1 : 2);

// ------------------------------------------------------------------ reading a View

/** Checks a View from a URL or a file: shape, sizes and values that could do harm when applied. */
export function readView(v: unknown): View {
  if (!isObj(v) || v.v !== 1 || !isObj(v.tokens))
    throw new Error("Not a Spring View v1 file: it needs v: 1 and a tokens object.");
  const modes = Array.isArray(v.modes)
    ? v.modes
        .filter(
          (m): m is string => typeof m === "string" && /^[\w-]{1,32}$/.test(m) && m !== "__proto__",
        )
        .slice(0, MAX_MODES)
    : [];
  if (!modes.length) modes.push("light");
  const tokens: View["tokens"] = {};
  let n = 0;
  for (const [k, raw] of Object.entries(v.tokens)) {
    if (n >= MAX_TOKENS) break;
    if (!/^[\w-]{1,120}$/.test(k) || k === "__proto__") continue;
    const per = typeof raw === "string" ? { [modes[0]!]: raw } : isObj(raw) ? raw : null;
    if (!per) continue;
    const clean: Record<string, string> = {};
    for (const [m, val] of Object.entries(per))
      if (modes.includes(m) && typeof val === "string" && safeValue(val)) clean[m] = val.trim();
    if (Object.keys(clean).length) {
      tokens[k] = clean;
      n++;
    }
  }
  const hits = (x: unknown): Hit[] =>
    Array.isArray(x)
      ? x
          .filter(
            (h): h is Hit => isObj(h) && typeof h.value === "string" && typeof h.at === "string",
          )
          .slice(0, 100)
          .map((h) => ({ value: h.value.slice(0, 120), at: h.at.slice(0, 300) }))
      : [];
  const u = isObj(v.usage) ? v.usage : undefined;
  return {
    v: 1,
    ...(typeof v.name === "string" ? { name: v.name.slice(0, 80) } : {}),
    modes,
    tokens,
    ...(Array.isArray(v.scoped)
      ? {
          scoped: v.scoped
            .filter(
              (s): s is { selector: string; count: number } =>
                isObj(s) && typeof s.selector === "string",
            )
            .slice(0, MAX_SCOPED)
            .map((s) => ({ selector: s.selector.slice(0, 200), count: count(s.count) })),
        }
      : {}),
    sources: strs(v.sources, 200),
    ...(u
      ? {
          usage: {
            files: count(u.files),
            refs: Object.fromEntries(
              Object.entries(isObj(u.refs) ? u.refs : {})
                .filter(([k, x]) => /^[\w-]{1,120}$/.test(k) && typeof x === "number")
                .slice(0, MAX_TOKENS)
                .map(([k, x]) => [k, count(x)]),
            ),
            raw: hits(u.raw),
            rawCount: count(u.rawCount),
            offSystem: hits(u.offSystem),
            offSystemCount: count(u.offSystemCount),
          },
        }
      : {}),
    ...(Array.isArray(v.notes) ? { notes: strs(v.notes, 50) } : {}),
  };
}

const strs = (x: unknown, max: number) =>
  Array.isArray(x)
    ? x
        .filter((s): s is string => typeof s === "string")
        .slice(0, max)
        .map((s) => s.slice(0, 300))
    : [];
const count = (x: unknown) => (typeof x === "number" && x >= 0 ? Math.floor(x) : 0);

/**
 * A value is applied as a custom property on the page, so it may not load
 * anything (url(), image-set, @import) or break out of its declaration.
 */
function safeValue(s: string): boolean {
  return s.length <= 500 && !/url\(|image-set|image\(|@import|expression\(|[;{}<>\\]/i.test(s);
}

// ------------------------------------------------------------------ resolving and grouping

/** Own keys only: a mode named "toString" or "constructor" must not find Object.prototype. */
const modeValue = (rec: Record<string, string> | undefined, mode: string, view: View) => {
  if (!rec) return undefined;
  const at = (m: string) => (Object.hasOwn(rec, m) ? rec[m] : undefined);
  return at(mode) ?? at(view.modes[0]!);
};

/** var(--x, fallback) → its value in this mode (falling back to the default mode), a few levels deep. */
export function resolve(view: View, name: string, mode: string): string | undefined {
  const own = Object.hasOwn(view.tokens, name) ? view.tokens[name] : undefined;
  let v = modeValue(own, mode, view);
  if (v === undefined) return undefined;
  for (let i = 0; i < 10 && v.includes("var("); i++) {
    const next = replaceVars(v, (n) => {
      return modeValue(Object.hasOwn(view.tokens, n) ? view.tokens[n] : undefined, mode, view);
    });
    if (next === v) break;
    v = next;
  }
  return v;
}

/** Replaces each var(--n[, fallback]) whose name lookup finds, with balanced parentheses. */
function replaceVars(v: string, lookup: (n: string) => string | undefined): string {
  let out = "";
  let i = 0;
  while (i < v.length) {
    const at = v.indexOf("var(", i);
    if (at < 0) {
      out += v.slice(i);
      break;
    }
    out += v.slice(i, at);
    let depth = 0;
    let j = at + 3;
    for (; j < v.length; j++) {
      if (v[j] === "(") depth++;
      else if (v[j] === ")" && --depth === 0) break;
    }
    const inner = v.slice(at + 4, j);
    const comma = topComma(inner);
    const n = (comma < 0 ? inner : inner.slice(0, comma)).trim().replace(/^--/, "");
    const fb = comma < 0 ? undefined : inner.slice(comma + 1).trim();
    out += lookup(n) ?? fb ?? v.slice(at, j + 1);
    i = j + 1;
  }
  return out;
}
const topComma = (s: string) => {
  let d = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") d++;
    else if (s[i] === ")") d--;
    else if (s[i] === "," && d === 0) return i;
  }
  return -1;
};

export type Kind =
  | "color"
  | "font"
  | "size"
  | "leading"
  | "tracking"
  | "weight"
  | "space"
  | "radius"
  | "shadow"
  | "motion"
  | "breakpoint"
  | "other";

const LENGTH = /^-?[\d.]+(px|rem|em|%|vw|vh|dvh|svh|ch|ex|pt)?$|^(clamp|calc|min|max)\(/i;

/**
 * What a token is, from its name first (namespaces are how systems say it)
 * and its resolved value second.
 */
export function kind(name: string, value: string | undefined): Kind {
  const n = name.toLowerCase();
  const v = (value ?? "").trim();
  if (/(^|-)(shadow|elevation)(-|$)/.test(n)) return "shadow";
  if (/(^|-)(ease|easing|duration|transition|animation|animate|delay|motion)(-|$)/.test(n))
    return "motion";
  if (/(^|-)(breakpoint|screen|bp)(-|$)/.test(n)) return "breakpoint";
  if (/(^|-)(radius|rounded|corner)(-|$)/.test(n)) return "radius";
  if (/(line-height|leading)/.test(n)) return "leading";
  if (/(letter-spacing|tracking)/.test(n)) return "tracking";
  if (/(^|-)(font-weight|weight)(-|$)/.test(n)) return "weight";
  if (/(^|-)(font-size|fs)(-|$)|^text-[\w-]+$/.test(n) && LENGTH.test(v)) return "size";
  if (/(^|-)(font|family|typeface)(-|$)/.test(n) && !/[\d.]+(px|rem)$/.test(v) && !isColor(v))
    return "font";
  if (isColor(v)) return "color";
  if (
    /(^|-)(space|spacing|gap|gutter|inset|padding|margin|size|sizing)(-|$)/.test(n) &&
    LENGTH.test(v)
  )
    return "space";
  return "other";
}

/** A color value Spring can read (hex, rgb, hsl, oklch, names, bare shadcn HSL channels). */
export function isColor(v: string): boolean {
  return !!colorOf(v);
}

/** A resolved value as something parseColorCss reads, or undefined. */
export function colorOf(v: string): string | undefined {
  const s = v.trim();
  if (!s) return undefined;
  const named = namedColor(s);
  if (named) return named;
  if (/^-?[\d.]+(deg)?\s+[\d.]+%\s+[\d.]+%(\s*\/\s*[\d.]+%?)?$/.test(s)) return `hsl(${s})`;
  return parseColorCss(s) ? s : undefined;
}

/** "color-primary-500" → { group: "primary", step: "500" }: how a palette strip is laid out. */
export function groupOf(name: string): { group: string; step?: string } {
  const n = name.replace(/^(color|colors|clr|c)-/, "");
  const m = n.match(/^(.+?)-(\d{1,4}|[a-z]?\d{1,3}[a-z]?|50|950)$/);
  if (m && /\d/.test(m[2]!)) return { group: m[1]!, step: m[2]! };
  const first = n.split("-")[0]!;
  return { group: first };
}

const key = (p: { fg: string; bg: string }) => `${p.fg}|${p.bg}`;

/** fg/bg pairs a system names on purpose: x / x-foreground, on-x / x, foreground / background. */
export function pairs(names: string[]): { fg: string; bg: string }[] {
  const has = new Set(names);
  const out: { fg: string; bg: string }[] = [];
  const add = (fg: string, bg: string) => has.has(bg) && fg !== bg && out.push({ fg, bg });
  for (const n of names) {
    const m = n.match(/^(.*?)-?(foreground|fg|text|on)$/);
    const on = n.match(/^(color-)?on-(.+)$/);
    if (on) add(n, `${on[1] ?? ""}${on[2]}`);
    else if (m && m[2] !== "on") {
      const base = m[1]!;
      if (!base || /^(color)?$/.test(base)) {
        const p = base.replace(/-$/, "");
        for (const bg of ["background", "bg", "surface", "canvas", "page"])
          add(n, p ? `${p}-${bg}` : bg);
        // "danger-text" is usually danger-colored text on the page, not text on a danger fill.
      } else if (m[2] !== "text") add(n, base);
    }
  }
  // Tailwind v4's @theme inline repeats each shadcn pair as color-x; keep one.
  const seen = new Set(out.map(key));
  return out.filter(
    (p) =>
      !(
        p.fg.startsWith("color-") &&
        p.bg.startsWith("color-") &&
        seen.has(key({ fg: p.fg.slice(6), bg: p.bg.slice(6) }))
      ),
  );
}

/**
 * A View as one CSS file (light on :root, dark on .dark, other modes on
 * [data-theme]), the shape audit's reader and inferInput understand.
 */
const selectorOf = (m: string, i: number) =>
  i === 0 ? ":root" : m === "dark" ? ".dark" : `[data-theme="${m}"]`;

export function toCss(view: View): string {
  return view.modes
    .map((m, i) => {
      const lines = Object.entries(view.tokens)
        .filter(([, per]) => per[m] !== undefined)
        .map(([n, per]) => `  --${n}: ${per[m]};`);
      return lines.length ? `${selectorOf(m, i)} {\n${lines.join("\n")}\n}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

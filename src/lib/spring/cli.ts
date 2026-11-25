/**
 * Spring for agents: one zero-dependency Node script (bundled by
 * scripts/build-spring-cli.ts into the `spring` skill).
 *
 *   spring scan [dir] [--json] [--out file] [--no-usage]
 *     Read the repo's design system and how the code uses it; print facts and
 *     a /spring/view link. Reads files only; sends nothing anywhere.
 *   spring build [spring.json] [--primary c] [--name n] [--font f] [--out dir] [--only a,b] [--print file]
 *     Generate a system with Spring's engine: tokens.css, tokens.json (DTCG),
 *     theme.css (Tailwind v4), DESIGN.md, SKILL.md, AGENTS.md, palette.js, spring.json.
 *   spring infer [dir] [--out spring.json]
 *     The closest spring.json to the repo's current system, to rebuild it cleanly.
 *   spring schema [input|view]
 */
import { lstatSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve as resolvePath, dirname, basename } from "node:path";
import { deflateRawSync } from "node:zlib";
import inputSchema from "../../../public/spring/schema.json";
import viewSchema from "../../../public/spring/view.schema.json";
import { audit } from "./audit";
import { over, wcagContrast } from "./colormath";
import { exportAll } from "./exports";
import { linkFor, readInput, writeInput } from "./io";
import { withFonts } from "./fonts-any";
import { buildSystem } from "./system";
import {
  colorOf,
  extract,
  kind,
  kindOf,
  pairs,
  resolve,
  toCss,
  type Hit,
  type Kind,
  type SourceFile,
  type Usage,
  type View,
} from "./tokens";

const VIEW_URL = "https://someshks.com/spring/view";
/** Chat apps and terminals stop linkifying long before browsers give up. */
const LINK_MAX = 8000;

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".turbo",
  ".vercel",
  ".output",
  ".cache",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  "target",
  "storybook-static",
  "__snapshots__",
]);
const CODE = /\.(css|scss|sass|less|pcss|ts|tsx|js|jsx|mjs|cjs|vue|svelte|astro|html|mdx)$/i;
const MAX_FILES = 20_000;
const MAX_BYTES = 1_000_000;

function* walk(root: string, dir = root, seen = { n: 0 }): Generator<string> {
  let names: string[];
  try {
    names = readdirSync(dir).sort();
  } catch {
    return;
  }
  for (const name of names) {
    if (seen.n >= MAX_FILES) return;
    const path = join(dir, name);
    let st;
    try {
      // lstat: a symlink could point out of the repo or back into it (loops).
      st = lstatSync(path);
    } catch {
      continue;
    }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name) && !(name.startsWith(".") && name !== ".storybook"))
        yield* walk(root, path, seen);
    } else if (st.size <= MAX_BYTES) {
      seen.n++;
      yield path;
    }
  }
}

const TOKEN_JSON = /(token|theme|design|variable|color|palette|semantic|primitive|brand)/i;

/** The files that define tokens, in a stable order: configs and JSON first, CSS last so it wins. */
function sources(root: string, all: string[]): SourceFile[] {
  const out: (SourceFile & { rank: number })[] = [];
  for (const abs of all) {
    const path = relative(root, abs).replaceAll("\\", "/");
    if (
      /\.min\.css$/i.test(path) ||
      /(^|\/)(package(-lock)?|tsconfig|jsconfig|components)\.json$/i.test(path)
    )
      continue;
    const isJson = path.toLowerCase().endsWith(".json");
    if (isJson && !TOKEN_JSON.test(path)) continue;
    if (
      !/\.(css|scss|sass|less|pcss|postcss|json)$/i.test(path) &&
      !/tailwind\.config\.|(^|\/)design\.md$/i.test(path)
    )
      continue;
    let text: string;
    try {
      text = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const k = kindOf(path, text);
    if (!k) continue;
    if (k === "css" && !/--[\w-]+\s*:/.test(text)) continue;
    out.push({
      path,
      text,
      rank: k === "tailwind" ? 0 : k === "json" ? 1 : k === "design.md" ? 2 : 3,
    });
  }
  return out.sort((a, b) => a.rank - b.rank || a.path.localeCompare(b.path));
}

// ------------------------------------------------------------------ usage

const COLOR_UTIL =
  "bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|fill|stroke|from|via|to|outline|decoration|divide|placeholder|accent|caret|shadow";
const UTIL = new RegExp(
  String.raw`(?<![\w-])(${COLOR_UTIL}|rounded(?:-[trblse]{1,2})?|font|leading|tracking|ease|duration|p[xytrbl]?|m[xytrbl]?|gap(?:-[xy])?|space-[xy]|w|h|size|inset|top|left|right|bottom)-([a-z0-9][\w.-]*?)(?:\/[\w.]+)?(?![\w-])`,
  "g",
);
const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const OFF = new RegExp(
  String.raw`(?<![\w-])(?:[\w-]+:)*(?:${COLOR_UTIL})-(?:((?:${PALETTE})-(?:50|[1-9]00|950))|\[(?:#[0-9a-f]{3,8}|(?:rgb|hsl|oklch)a?\([^\]]*\))\])(?:\/[\w.]+)?(?![\w-])`,
  "gi",
);
const LITERAL =
  /#[0-9a-f]{8}\b|#[0-9a-f]{6}\b|#[0-9a-f]{3,4}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\([^)]*\)/gi;
/** JS lines that set styles: elsewhere a hex is as likely an id or a hash. */
const STYLE_LINE =
  /(color|background|border|fill|stroke|shadow|style|className|class=|theme|palette|gradient)/i;
const DEFINES = /(^|[{;\s])--[\w-]+\s*:/;

/** Which tokens a utility class could mean, by Tailwind v4 namespace (and shadcn's bare names). */
function candidates(util: string, x: string): string[] {
  if (new RegExp(`^(${COLOR_UTIL})$`).test(util)) {
    const c = [`color-${x}`, x];
    if (util === "text") c.push(`text-${x}`);
    if (util === "shadow") c.push(`shadow-${x}`);
    return c;
  }
  if (util.startsWith("rounded")) return [`radius-${x}`];
  if (util === "font") return [`font-${x}`, `font-weight-${x}`];
  if (util === "leading") return [`leading-${x}`];
  if (util === "tracking") return [`tracking-${x}`];
  if (util === "ease") return [`ease-${x}`];
  if (util === "duration") return [`duration-${x}`];
  return [`spacing-${x}`];
}

function usage(root: string, files: string[], view: View, defs: Set<string>): Usage {
  const names = new Set(Object.keys(view.tokens));
  const refs: Record<string, number> = Object.fromEntries([...names].map((n) => [n, 0]));
  const raw: Hit[] = [];
  const offSystem: Hit[] = [];
  let rawCount = 0;
  let offSystemCount = 0;
  let scanned = 0;
  for (const abs of files) {
    if (!CODE.test(abs) || /\.(test|spec|stories)\.[jt]sx?$/.test(abs)) continue;
    let text: string;
    try {
      text = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    scanned++;
    const path = relative(root, abs).replaceAll("\\", "/");
    const isCss = /\.(css|scss|sass|less|pcss)$/i.test(path);
    const isDef = defs.has(path);
    text.split("\n").forEach((line, i) => {
      if (line.length > 2000) return;
      const defining = DEFINES.test(line);
      if (!defining || !isDef)
        for (const m of line.matchAll(/var\(\s*--([\w-]+)/g)) if (names.has(m[1]!)) refs[m[1]!]!++;
      if (!isCss)
        for (const m of line.matchAll(UTIL))
          for (const c of candidates(m[1]!, m[2]!)) if (names.has(c)) refs[c]!++;
      for (const m of line.matchAll(OFF)) {
        // On-system only when the system defines that exact step.
        const step = m[1]?.toLowerCase();
        if (step && (names.has(`color-${step}`) || names.has(step))) continue;
        offSystemCount++;
        if (offSystem.length < 100) offSystem.push({ value: m[0], at: `${path}:${i + 1}` });
      }
      if (defining || (!isCss && !STYLE_LINE.test(line))) return;
      if (/^\s*(\/\/|\*|\/\*)/.test(line) || /\[(#|rgb|hsl|oklch)/i.test(line)) return;
      for (const m of line.matchAll(LITERAL)) {
        if (m[0].includes("var(")) continue;
        rawCount++;
        if (raw.length < 100) raw.push({ value: m[0], at: `${path}:${i + 1}` });
      }
    });
  }
  // A token another token points at is used through it (shadcn's @theme inline aliases).
  // Walk alias chains to the end; a token already counted isn't queued again, so cycles stop.
  const queue = Object.keys(refs).filter((n) => refs[n]);
  while (queue.length) {
    const n = queue.pop()!;
    for (const v of Object.values(view.tokens[n] ?? {}))
      for (const m of v.matchAll(/var\(\s*--([\w-]+)/g))
        if (names.has(m[1]!) && refs[m[1]!] === 0) {
          refs[m[1]!] = refs[n]!;
          queue.push(m[1]!);
        }
  }
  return { files: scanned, refs, raw, rawCount, offSystem, offSystemCount };
}

// ------------------------------------------------------------------ facts

interface Pair {
  fg: string;
  bg: string;
  mode: string;
  ratio: number | null;
}

/** The page color for a mode: the composite backdrop for alpha. */
const opaque = (c: string) => over(c, "#000000") === over(c, "#ffffff");

/** The page backdrop; null when the theme names one we can't parse (so translucent pairs go unmeasured). */
function pageOf(view: View, mode: string): string | null {
  for (const n of [
    "background",
    "color-background",
    "bg",
    "color-bg",
    "surface",
    "color-surface",
    "canvas",
    "page",
  ]) {
    const v = resolve(view, n, mode);
    if (v === undefined) continue;
    return colorOf(v) ?? null;
  }
  return /dark/.test(mode) ? "#000000" : "#ffffff";
}

export function contrastPairs(view: View): Pair[] {
  const out: Pair[] = [];
  for (const mode of view.modes) {
    const page = pageOf(view, mode);
    for (const { fg, bg } of pairs(Object.keys(view.tokens))) {
      const b = colorOf(resolve(view, bg, mode) ?? "");
      const f = colorOf(resolve(view, fg, mode) ?? "");
      // Without a readable page, only opaque pairs can be measured.
      if (!b || !f || (page === null && !(opaque(b) && opaque(f)))) {
        out.push({ fg, bg, mode, ratio: null });
        continue;
      }
      const solidBg = over(b, page ?? "#ffffff");
      out.push({
        fg,
        bg,
        mode,
        ratio: Math.round(wcagContrast(over(f, solidBg), solidBg) * 100) / 100,
      });
    }
  }
  return out;
}

function counts(view: View): Record<Kind, number> {
  const out = {} as Record<Kind, number>;
  for (const n of Object.keys(view.tokens)) {
    const k = kind(n, resolve(view, n, view.modes[0]!));
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function viewLink(view: View): string {
  const json = JSON.stringify(view);
  return `${VIEW_URL}#d=${deflateRawSync(Buffer.from(json)).toString("base64url")}`;
}

const list = (xs: string[], max = 8) =>
  xs.slice(0, max).join(", ") + (xs.length > max ? `, +${xs.length - max} more` : "");

function summary(view: View, dir: string, link: string | null, file: string | null): string {
  const lines = [`Spring scan of ${dir}`];
  if (!view.sources.length) {
    lines.push(
      "No design tokens found: no CSS custom properties, tokens JSON, Tailwind theme or DESIGN.md.",
    );
  } else lines.push(`Sources (${view.sources.length}): ${list(view.sources)}`);
  lines.push(`Modes: ${view.modes.join(", ")}`);
  const c = counts(view);
  const total = Object.keys(view.tokens).length;
  lines.push(
    `Tokens: ${total}` +
      (total
        ? ` (${Object.entries(c)
            .sort((a, b) => b[1] - a[1])
            .map(([k, n]) => `${k} ${n}`)
            .join(", ")})`
        : ""),
  );
  const ps = contrastPairs(view);
  if (ps.length) {
    const low = ps.filter((p) => p.ratio !== null && p.ratio < 4.5);
    const unread = ps.filter((p) => p.ratio === null).length;
    lines.push(
      `Contrast: ${ps.length} named text/background pairs; ${low.length} under 4.5:1` +
        (low.length
          ? `: ${list(
              low.map((p) => `${p.fg} on ${p.bg} (${p.mode}) ${p.ratio}`),
              6,
            )}`
          : "") +
        (unread
          ? `; ${unread} not computed here (color-mix or unresolved; the view resolves them)`
          : ""),
    );
  }
  const u = view.usage;
  if (u) {
    const unused = Object.entries(u.refs)
      .filter(([, n]) => n === 0)
      .map(([k]) => `--${k}`);
    lines.push(
      `Usage (${u.files} files): ${total - unused.length} of ${total} tokens referenced` +
        (unused.length ? `; never referenced: ${list(unused)}` : ""),
    );
    lines.push(
      `Color literals outside tokens: ${u.rawCount}` +
        (u.raw.length
          ? ` (${list(
              u.raw.map((h) => `${h.value} ${h.at}`),
              5,
            )})`
          : ""),
    );
    if (u.offSystemCount)
      lines.push(
        `Off-system color classes: ${u.offSystemCount} (${list(
          u.offSystem.map((h) => `${h.value} ${h.at}`),
          5,
        )})`,
      );
  }
  for (const n of view.notes ?? []) lines.push(`Note: ${n}`);
  if (link) lines.push(`View: ${link}`);
  if (file)
    lines.push(
      link
        ? `Saved: ${file}`
        : `View: the link would be too long to paste, so open ${VIEW_URL} and drop ${file} on it.`,
    );
  return lines.join("\n");
}

// ------------------------------------------------------------------ build

function build({ _: pos, opts: o }: Args) {
  const file = pos[0];
  const raw: Record<string, unknown> = file ? JSON.parse(readFileSync(file, "utf8")) : {};
  if (o.primary) raw.primary = o.primary;
  if (o.name) raw.name = o.name;
  const t = { ...(raw.type as object | undefined) } as Record<string, unknown>;
  if (o.font) t.body = t.heading = o.font;
  if (o.heading) t.heading = o.heading;
  if (o.mono) t.mono = o.mono;
  raw.type = t;
  if (o.styling) raw.stack = { ...(raw.stack as object | undefined), styling: o.styling };
  if (o.contrast) raw.contrast = o.contrast;
  const fontNotes: string[] = [];
  withFonts(raw, fontNotes);
  const { input, notes } = readInput(raw);
  const sys = buildSystem(input);
  const files = [
    ...exportAll(sys),
    { path: "spring.json", label: "Spring input", content: writeInput(input) },
  ];
  const only = o.only?.split(",").map((x) => x.trim().toLowerCase());
  const keep = only
    ? files.filter((f) =>
        only.some(
          (x) => f.path.toLowerCase() === x || basename(f.path).toLowerCase().startsWith(x),
        ),
      )
    : files;
  if (o.print) {
    const f = files.find((x) => x.path === o.print || basename(x.path) === o.print);
    if (!f) fail(`No file named ${o.print}. Files: ${files.map((x) => x.path).join(", ")}`);
    process.stdout.write(f.content);
    // Notes go to stderr so the printed file stays clean.
    for (const n of [...fontNotes, ...notes]) console.warn(`Note: ${n}`);
    return;
  }
  const out = [`Spring build: ${input.name}`];
  if (o.out) {
    for (const f of keep) {
      const p = join(o.out, f.path);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, f.content);
    }
    out.push(`Wrote ${keep.length} files to ${o.out}: ${keep.map((f) => f.path).join(", ")}`);
  } else
    out.push(
      `Files (pass --out dir to write, --print name to print one): ${keep.map((f) => f.path).join(", ")}`,
    );
  const failing = sys.checks.light.concat(sys.checks.dark).filter((c) => !c.pass && !c.advisory);
  out.push(
    failing.length
      ? `Contrast: ${failing.length} pairs miss the target: ${failing.map((c) => `${c.fg} on ${c.bg} ${c.ratio.toFixed(2)}`).join(", ")}`
      : "Contrast: every role pair passes the target.",
  );
  for (const a of sys.adjustments) out.push(`Adjusted: ${a}`);
  for (const n of [...fontNotes, ...notes]) out.push(`Note: ${n}`);
  out.push(`Edit: ${linkFor(input)}`);
  say(out.join("\n"));
}

// ------------------------------------------------------------------ main

interface Args {
  _: string[];
  flags: Set<string>;
  opts: Record<string, string>;
}

const BOOL = new Set(["json", "no-usage", "help"]);

function parse(argv: string[]): Args {
  const out: Args = { _: [], flags: new Set(), opts: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith("--")) {
      out._.push(a);
      continue;
    }
    const eq = a.indexOf("=");
    const k = eq < 0 ? a.slice(2) : a.slice(2, eq);
    if (eq >= 0) out.opts[k] = a.slice(eq + 1);
    else if (!BOOL.has(k) && argv[i + 1] !== undefined && !argv[i + 1]!.startsWith("--"))
      out.opts[k] = argv[++i]!;
    else out.flags.add(k);
  }
  return out;
}

const say = (s: string) => process.stdout.write(s + "\n");

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const HELP = `spring scan [dir] [--json] [--out file] [--no-usage]
spring build [spring.json] [--primary color] [--name n] [--font f] [--heading f] [--mono f]
             [--contrast aa|aaa|apca] [--styling tailwind|css] [--out dir] [--only a,b] [--print file]
spring infer [dir] [--out spring.json]
spring schema [input|view]`;

export function main(argv = process.argv.slice(2)) {
  const [cmd, ...rest] = argv;
  const args = parse(rest);
  if (cmd === "scan") {
    const dir = resolvePath(args._[0] ?? ".");
    const all = [...walk(dir)];
    const src = sources(dir, all);
    const view = extract(src, basename(dir));
    if (!args.flags.has("no-usage"))
      view.usage = usage(dir, all, view, new Set(src.map((s) => s.path)));
    if (args.flags.has("json")) {
      if (args.opts.out) writeFileSync(args.opts.out, JSON.stringify(view, null, 2) + "\n");
      process.stdout.write(JSON.stringify(view, null, 2) + "\n");
      return;
    }
    const link = viewLink(view);
    const fits = link.length <= LINK_MAX;
    let file: string | null = null;
    if (args.opts.out || !fits) {
      file = args.opts.out ?? join(tmpdir(), `spring-view-${Date.now()}.json`);
      writeFileSync(file, JSON.stringify(view, null, 2) + "\n");
    }
    say(summary(view, dir, fits ? link : null, file));
    return;
  }
  if (cmd === "infer") {
    const dir = resolvePath(args._[0] ?? ".");
    const view = extract(sources(dir, [...walk(dir)]), basename(dir));
    if (!Object.keys(view.tokens).length) fail(`No design tokens found in ${dir}.`);
    const { input } = audit(toCss(view));
    const text = writeInput({ ...input, name: view.name ?? input.name });
    if (args.opts.out) {
      writeFileSync(args.opts.out, text);
      say(`Wrote ${args.opts.out}: the closest Spring starting point to ${dir}.`);
    } else process.stdout.write(text);
    console.warn(
      "Closest starting point, not a conversion: brand hue, chroma, grays, fonts, base size, ratio and radius are inferred.",
    );
    return;
  }
  if (cmd === "build") return build(args);
  if (cmd === "schema") {
    process.stdout.write(
      JSON.stringify(args._[0] === "view" ? viewSchema : inputSchema, null, 2) + "\n",
    );
    return;
  }
  say(HELP);
  if (cmd && cmd !== "help" && cmd !== "--help") process.exit(1);
}

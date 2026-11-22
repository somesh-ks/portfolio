#!/usr/bin/env node
// Checks a token layer and the code that uses it. Node 18+, no dependencies.
//
//   node check-tokens.mjs <path>...                  token files (.tokens.json, CSS) and component source, mixed
//   node check-tokens.mjs --min-coverage 80 <path>   also fail when a category is below 80% tokenized
//   node check-tokens.mjs --hygiene <path>...        also check dead semantic tokens and $description when/never
//   node check-tokens.mjs --self-test                prove each check fires on built-in fixtures
//
// [a] key sets per axis value  [b] override blocks  [c] tier violations  [d] coverage  [e] DTCG shape  [f] hygiene.
// Reads DTCG files and plain CSS (:root, [data-*], .dark, @media prefers-*, @theme). Exit 1 on any finding.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';

const HUES = 'slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const PALETTE_VAR = new RegExp(`^--(?:color-)?(?:${HUES})-\\d{2,3}$`);
const COLOR_UTIL = /^(?:bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|outline|fill|stroke|divide|from|via|to|placeholder|caret|accent|decoration|shadow)-(.+?)(?:\/\d+)?$/;
const PALETTE_CLASS = new RegExp(`^[a-z-]+-(?:(?:${HUES})-\\d{2,3}|white|black)(?:/\\d+)?$`);
const ARBITRARY = /^[a-z][\w-]*-\[(?:#[0-9a-f]{3,8}|(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch)\(.*\)|-?\d*\.?\d+(?:px|rem|em|ms|s))\]$/i;
const HEX = /(?<![\w&#/-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/i;
const COLOR_FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*(?!from\b)(?![^)]*var\()/i;
const rawColor = (s) => HEX.test(s.replace(/\b(?:href|to|id)=["']#[\w-]*/g, '')) || COLOR_FN.test(s);
const STEP = /-\d{1,3}$/;
const VARS = (s) => [...String(s).matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
const NEUTRAL = /^(?:0|none|inherit|initial|unset|revert|currentcolor|transparent|auto|normal|100%|0 auto)$/i;
const CATS = [ // [category, property, untokenized literal in a value]
  ['color', /^(?:color|background(?:-color)?|border(?:-[a-z]+)*-color|outline-color|fill|stroke|caret-color|accent-color|text-decoration-color)$/, (v) => rawColor(v)],
  ['spacing', /^(?:(?:margin|padding)(?:-[a-z]+)*|gap|row-gap|column-gap)$/, (v) => /(?:^|[\s(,])-?\d*\.?\d+(?:px|rem|em)\b/.test(v)],
  ['typography', /^(?:font-size|font-weight|line-height|letter-spacing|font-family)$/, (v) => /\d(?:px|rem|em)\b|^\d+$/.test(v)],
  ['radius', /^border(?:-[a-z]+)*-radius$/, (v) => /\d(?:px|rem|em|%)/.test(v)],
  ['shadow', /^box-shadow$/, (v) => /\d(?:px|rem)/.test(v) || rawColor(v)],
  ['motion', /^(?:transition|animation)(?:-duration|-timing-function|-delay)?$/, (v) => /\d(?:ms|s)\b|cubic-bezier\(/.test(v)],
  ['layer', /^z-index$/, (v) => /^-?\d+$/.test(v)],
];
const TW = [ // [category, on-scale class, off-scale class], variants already stripped
  ['spacing', /^-?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy])-(?:\d+(?:\.5)?|px)$/, /^-?(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy])-\[/],
  ['typography', /^(?:text-(?:xs|sm|base|lg|\d?xl)|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)|leading-[a-z]+|tracking-[a-z]+)$/,
    /^(?:text|leading|tracking|font)-\[[\d.]+(?:px|rem|em)?\]$/],
  ['radius', /^rounded(?:-[a-z]{1,2})?(?:-(?:none|xs|sm|md|lg|\d?xl|full))?$/, /^rounded(?:-[a-z]{1,2})?-\[/],
  ['shadow', /^shadow(?:-(?:2xs|xs|sm|md|lg|\d?xl|none))?$/, /^shadow-\[/],
  ['motion', /^(?:duration|delay|ease)-\(--[\w-]+\)$|^ease-(?:linear|in|out|in-out)$/, /^(?:duration|delay)-\d+$|^(?:duration|delay|ease)-\[/],
  ['layer', /^z-\(--[\w-]+\)$/, /^-?z-(?:\d+|\[)/],
];
const AXIS = { theme: 'mode', mode: 'mode', scheme: 'mode', 'color-scheme': 'mode', appearance: 'mode', 'reduced-motion': 'motion', themes: 'mode', modes: 'mode', brands: 'brand' };
const normAxis = (a) => AXIS[a] ?? a;
const AXIS_SEL = /\[data-[\w-]+\s*=|\.(?:dark|light)\b|\.(?:theme|brand|density|mode|contrast|motion)-/;
const THEMEISH = /:root|:host|\bhtml\b|\bbody\b|\[data-[\w-]+(?:\s*[~|^$*]?=\s*["']?[\w-]+["']?)?\]|\.(?:dark|light)\b|\.(?:theme|brand|density|mode|contrast|motion)-[\w-]+|:(?:not|is|where)\(|[()&>*,\s]/g;
const COLOR_SPACES = new Set('srgb srgb-linear hsl hwb lab lch oklab oklch display-p3 a98-rgb prophoto-rgb rec2020 xyz-d65 xyz-d50'.split(' '));
const ALIAS = /^\{([^{}]+)\}$/;
const SKIP_DIR = /^(?:node_modules|\.git|dist|build|out|\.next|\.nuxt|coverage|\.turbo)$/;
const SOURCE = /\.(?:css|scss|less|pcss|tsx|jsx|ts|js|mjs|vue|svelte|astro|html|mdx)$/;
const NOT_SOURCE = /\.d\.ts$|\.min\.|(?:^|[/\\.])tokens?\.m?[jt]s$|tailwind\.config|\.resolver\.json$/;

// CSS: every declaration with its line and the chain of selectors and at-rules around it.
function parseCss(text) {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const out = []; const stack = []; let buf = ''; let line = 1; let at = 1;
  const flush = () => {
    const t = buf.trim(); const m = t.match(/^(--[\w-]+|[a-z-]+)\s*:\s*([\s\S]+)$/i);
    if (stack.length && m) out.push({ prop: m[1].toLowerCase(), value: m[2].trim(), line: at, ctx: stack.slice() });
    else if (/^@apply\s/.test(t)) out.push({ prop: '@apply', value: t.slice(7), line: at, ctx: stack.slice() });
    buf = '';
  };
  for (const ch of src) {
    if (ch === '{') { stack.push(buf.trim()); buf = ''; } else if (ch === '}') { flush(); stack.pop(); } else if (ch === ';') flush();
    else { if (!buf.trim() && /\S/.test(ch)) at = line; buf += ch; }
    if (ch === '\n') line++;
  }
  return out;
}

// Which theme seam a CSS block is: a component rule, a base token block, or an override for one axis value.
function block(ctx) {
  const at = ctx.filter((p) => p.startsWith('@')).join(' ');
  const sel = ctx.filter((p) => !p.startsWith('@')).join(' ');
  if (!/@theme\b/.test(at) && (!sel || sel.replace(THEMEISH, ''))) return { kind: 'component', sel };
  const scopes = new Set([...sel.matchAll(/\[data-([\w-]+)|\.(dark|light)\b|\.(theme|brand|density|mode|contrast|motion)-/g)].map((m) => normAxis(m[1] ?? (m[2] ? 'mode' : m[3]))));
  const base = { kind: 'base', scopes, sel: sel || at, inline: /@theme\b[^@]*\binline\b/.test(at) };
  let m = at.match(/prefers-(color-scheme|contrast|reduced-motion)\s*:\s*([\w-]+)/);
  if (m) return { ...base, kind: 'override', axis: { axis: normAxis(m[1]), value: m[2], mech: `@media (prefers-${m[1]}: ${m[2]})`, doc: true } };
  const parts = sel.split(',').map((p) => p.replace(/:not\([^)]*\)/g, ''));
  if (parts.some((p) => !AXIS_SEL.test(p))) return base;
  const s = parts.join(',');
  const axis = (m = s.match(/\[data-([\w-]+)\s*=\s*["']?([\w-]+)/)) ? { axis: normAxis(m[1]), value: m[2] }
    : (m = s.match(/\.(dark|light)\b/)) ? { axis: 'mode', value: m[1] }
    : (m = s.match(/\.(theme|brand|density|mode|contrast|motion)-([\w-]+)/)) && { axis: normAxis(m[1]), value: m[2] };
  return { ...base, kind: 'override', axis: { ...axis, mech: sel.trim(), doc: parts.every((p) => /^\s*(?::root|html)\b/.test(p)) } };
}

// DTCG: flatten tokens with inherited $type; structural errors go to err().
function walkDtcg(node, path, type, out, err) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$') || !v || typeof v !== 'object' || Array.isArray(v)) continue;
    const p = [...path, k];
    if ('$value' in v) out.push({ path: p, type: v.$type ?? type, value: v.$value, deprecated: v.$deprecated, description: v.$description });
    else if ('value' in v && typeof v.value !== 'object') err(p, 'uses `value` without `$`: a pre-DTCG format');
    else if (Object.keys(v).length && Object.keys(v).every((x) => x.startsWith('$'))) err(p, 'has $-properties but no $value');
    else walkDtcg(v, p, v.$type ?? type, out, err);
  }
}

function shape(t, all) {
  const v = t.value;
  for (const r of JSON.stringify(v).match(/\{[^{}"]+\}/g) ?? []) if (!all.has(r.slice(1, -1))) return `alias ${r} points at no token`;
  let type = t.type; let a = typeof v === 'string' && v.match(ALIAS);
  for (let i = 0; !type && a && i < 10; i++) { const x = all.get(a[1]); type = x?.type; a = x && typeof x.value === 'string' && x.value.match(ALIAS); }
  if (typeof v === 'string' && ALIAS.test(v)) return type ? null : 'no $type on the token, its group, or its alias target';
  if (!type) return 'no $type: tools must not guess it from the value';
  if (type === 'color') {
    if (typeof v === 'string') return /^#[0-9a-f]{3,8}$/i.test(v) ? 'colour is a hex string; 2025.10 wants {colorSpace, components}' : 'colour is not a {colorSpace, components} object';
    if (!COLOR_SPACES.has(v?.colorSpace)) return `colorSpace ${JSON.stringify(v?.colorSpace)} is not one of the 2025.10 spaces`;
    if (!Array.isArray(v.components) || v.components.length !== 3 || v.components.some((c) => c !== 'none' && typeof c !== 'number')) return 'components must be three numbers or "none"';
    if (v.alpha !== undefined && !(v.alpha >= 0 && v.alpha <= 1)) return 'alpha must be 0 to 1';
    if (v.hex !== undefined && !/^#[0-9a-f]{6}$/i.test(v.hex)) return 'hex fallback must be 6-digit';
  }
  const units = { dimension: ['px', 'rem'], duration: ['ms', 's'] }[type];
  if (units && typeof v !== 'object') return `${type} written as a ${typeof v}; 2025.10 wants {value, unit}`;
  if (units && (typeof v.value !== 'number' || !units.includes(v.unit))) return `${type} needs a numeric value and a unit (${units.join(' or ')})`;
  if (type === 'dimension' && v?.unit === 'px' && t.path.some((seg) => /^(?:leading|line-height|lineHeight)$/i.test(seg))) {
    return 'line-height / leading token uses px; use a unitless number token so zoomed text scales proportionally';
  }
  const inUnit = (n) => n >= 0 && n <= 1;
  if (type === 'cubicBezier' && !(Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === 'number') && inUnit(v[0]) && inUnit(v[2]))) {
    return 'cubicBezier needs [x1, y1, x2, y2] with x in 0 to 1';
  }
  if (type === 'fontWeight' && typeof v === 'number' && !(v >= 1 && v <= 1000)) return 'fontWeight must be 1 to 1000';
  return null;
}

function fileAxis(p) {
  const b = basename(p).replace(/\.tokens(?:\.json)?$|\.json$/, '');
  let m = b.match(/^(mode|theme|brand|density|contrast|motion)[.-]([\w-]+)$/);
  if (m) return { axis: normAxis(m[1]), value: m[2], mech: basename(p) };
  m = basename(dirname(p)).match(/^(modes?|themes?|brands?|density|contrast|motion)$/);
  return m && { axis: normAxis(m[1].replace(/s$/, '')), value: b, mech: basename(p) };
}

export function analyse(files, { minCoverage = 0, hygiene = false } = {}) {
  const F = { a: [], b: [], c: [], d: [], e: [], f: [] };
  const add = (k, where, msg) => F[k].push(`${where}  ${msg}`);
  const defs = []; const uses = []; const dtcg = []; const comp = new Set(); const deprecated = new Set(); const all = new Map();
  for (const { path, text } of files) {
    if (/\.(?:tokens(?:\.json)?|json)$/.test(path)) {
      let json; try { json = JSON.parse(text); } catch (e) { add('e', path, `not valid JSON: ${e.message}`); continue; }
      const toks = []; walkDtcg(json, [], json.$type, toks, (p, msg) => add('e', `${path} ${p.join('.')}`, msg));
      const axis = fileAxis(path); const compFile = /components?/.test(basename(dirname(path)));
      const primFile = /primitives?|core/.test(basename(dirname(path)) + basename(path));
      for (const t of toks) {
        const name = '--' + t.path.join('-'); const a = typeof t.value === 'string' && t.value.match(ALIAS);
        all.set(t.path.join('.'), t); dtcg.push({ t, path });
        if (t.deprecated) deprecated.add(name);
        if (compFile || /^components?$/.test(t.path[0])) comp.add(name);
        const blk = axis ? { kind: 'override', axis: { ...axis, doc: true }, scopes: new Set() } : { kind: 'base', scopes: new Set(), sel: path };
        const prim = !a && (primFile || /^(?:primitives?|core|base|global|ref)$/.test(t.path[0]));
        const refs = a ? ['--' + a[1].replace(/\./g, '-')] : [];
        defs.push({ name, value: JSON.stringify(t.value), refs, color: t.type === 'color', prim, where: `${path} ${t.path.join('.')}`, blk });
      }
      continue;
    }
    const style = /\.(?:vue|svelte|astro|html)$/.test(path);
    const blank = (s) => s.replace(/[^\n]/g, ' ');
    const styleOnly = () => text.replace(/(<style[^>]*>)([\s\S]*?)<\/style>|[^<\n]+|</g, (m, open, body) => (body === undefined ? blank(m) : blank(open) + body + blank('</style>')));
    const css = /\.(?:css|scss|less|pcss)$/.test(path) ? text : style ? styleOnly() : '';
    for (const d of parseCss(css)) {
      const blk = block(d.ctx); const where = `${path}:${d.line}`;
      if (d.prop === '@apply') uses.push({ classes: d.value.split(/\s+/), where });
      else if (d.prop.startsWith('--') && blk.kind !== 'component') defs.push({ name: d.prop, value: d.value, refs: VARS(d.value), where, blk, css: true });
      else {
        if (d.prop.startsWith('--')) comp.add(d.prop);
        if (d.prop !== 'color-scheme') uses.push({ prop: d.prop, value: d.value, where });
      }
    }
    if (!/\.(?:css|scss|less|pcss)$/.test(path)) (style ? text.replace(/<style[^>]*>[\s\S]*?<\/style>/g, blank) : text).split('\n').forEach((line, i) => {
      if (!line.trim()) return;
      const classes = line.match(/(?<=^|[\s"'`{(,])(?:[\w-]+:)*!?-?[a-z][a-z0-9-]*(?:\.5)?(?:-\[[^\]\s]+\]|-\(--[\w-]+\))?(?:\/\d+)?(?=$|[\s"'`}),])/g) ?? [];
      uses.push({ classes, line, where: `${path}:${i + 1}` });
    });
  }

  // Tiers. A primitive is a literal on a scale step (or in a primitive group); a ramp alias is a step name pointing at one.
  const base = new Map(); for (const d of defs) if (d.blk.kind === 'base' && !base.has(d.name)) base.set(d.name, d);
  const prim = new Set(defs.filter((d) => d.blk.kind === 'base' && !d.refs.length && (d.prim || STEP.test(d.name))).map((d) => d.name));
  const ramp = new Set([...base.values()].filter((d) => STEP.test(d.name) && d.refs.length === 1 && prim.has(d.refs[0])).map((d) => d.name));
  const literal = (n, i = 0) => { const d = base.get(n); return !d || i > 10 ? '' : d.refs.length ? literal(d.refs[0], i + 1) : d.value; };
  const isColor = (d) => d.color ?? rawColor(literal(d.name));
  const dependsOn = (n, keys, i = 0) => keys.has(n) || (i < 10 && (base.get(n)?.refs ?? []).some((r) => dependsOn(r, keys, i + 1)));
  const overrides = defs.filter((d) => d.blk.kind === 'override');

  // [a] key sets: every value of an axis, and every mechanism of one value, defines the same keys.
  const vals = {};
  for (const d of overrides) { const { axis, value, mech } = d.blk.axis; (((vals[`${d.css ? 'css' : 'dtcg'} ${axis}`] ??= {})[value] ??= {})[mech] ??= new Map()).set(d.name, d.where); }
  for (const [group, byVal] of Object.entries(vals)) {
    const axis = group.split(' ')[1];
    const union = (v) => new Map(Object.values(byVal[v]).flatMap((m) => [...m]));
    const first = (v) => [...union(v).values()][0];
    for (const [v, mechs] of Object.entries(byVal)) {
      const list = Object.entries(mechs);
      for (const [m1, x] of list) for (const [m2, y] of list) for (const k of x.keys()) {
        if (m1 !== m2 && !y.has(k)) add('a', [...y.values()][0], `${axis}=${v} via ${m2} lacks ${k}, which ${m1} sets; the interface is half-themed when one mechanism wins`);
      }
      if (Object.keys(byVal).length === 1) for (const [k, where] of union(v)) if (!base.has(k)) add('a', where, `${axis}=${v} defines ${k}, which no base block declares; the default has no value for it`);
      for (const w of Object.keys(byVal)) for (const k of union(w).keys()) if (w !== v && !union(v).has(k)) add('a', first(v), `${axis}=${v} lacks ${k}, which ${axis}=${w} sets`);
      if (axis !== 'mode' || v === 'light' || byVal.light) continue;
      for (const d of base.values()) {
        if (prim.has(d.name) || ramp.has(d.name) || comp.has(d.name) || union(v).has(d.name) || /light-dark\(/.test(d.value) || !isColor(d) || dependsOn(d.name, union(v))) continue;
        add('a', d.where, `${d.name} is not redefined for mode=${v}; it renders its light value there (redeclare it if intended)`);
      }
    }
  }

  // [b] override blocks: never touch primitives or component tokens; respect @theme inline, subtree scope, and reduced motion.
  const scoped = (axis) => new Set(defs.filter((d) => d.blk.scopes?.has(axis)).map((d) => d.name));
  const seen = new Set();
  for (const o of overrides) {
    const { axis, mech, doc } = o.blk.axis;
    if (prim.has(o.name)) add('b', o.where, `${mech} overrides primitive ${o.name}; repoint the semantic token (or the ramp alias, for a brand) instead`);
    if (comp.has(o.name)) add('b', o.where, `${mech} overrides component token ${o.name}; theme the semantic token it reads`);
    const inl = defs.find((d) => d.name === o.name && d.blk.inline);
    if (inl) {
      const r = inl.refs[0];
      const fix = r && !prim.has(r) && !PALETTE_VAR.test(r) ? `Override ${r} instead` : `Point it at a semantic variable, such as var(--${o.name.replace(/^--color-/, '')}), and override that`;
      add('b', o.where, `${o.name} is in @theme inline (${inl.where}), so utilities hold ${inl.value}; this override never reaches them. ${fix}`);
    }
    if (axis === 'motion' && /^--(?:duration|delay|transition|animation)/.test(o.name) && /^0*\.?0*1?m?s?$/.test(o.value)) {
      add('b', o.where, `reduced motion sets ${o.name} to ${o.value}; keep durations so fades survive, neutralise travel tokens (distance, scale) instead`);
    }
    if (doc || !o.css) continue;
    for (const d of defs) {
      const key = `${d.where}|${axis}`;
      if (!d.css || d.blk.inline || d.name === o.name || !d.refs.includes(o.name) || d.blk.scopes.has(axis) || scoped(axis).has(d.name) || seen.has(key)) continue;
      seen.add(key);
      const fix = /^@theme/.test(d.blk.sel) ? `Use @theme inline so utilities read ${o.name} where they render` : `Add the ${axis} selector to that block`;
      add('b', d.where, `${d.name} reads ${o.name}, which ${mech} overrides, but is declared only on ${d.blk.sel}; on a nested ${mech} it keeps the outer value. ${fix}`);
    }
  }

  // [c] tier violations and [d] coverage in component code.
  const cov = Object.fromEntries(CATS.map(([c]) => [c, [0, 0]]));
  const count = (cat, ok) => { cov[cat][1]++; if (ok) cov[cat][0]++; };
  const checkVars = (s, where) => { for (const r of VARS(s)) {
    if (prim.has(r) || PALETTE_VAR.test(r)) add('c', where, `var(${r}) is a primitive; use the semantic token for the role`);
    else if (ramp.has(r)) add('c', where, `var(${r}) is a ramp alias; components read semantic tokens`);
    if (deprecated.has(r)) add('c', where, `var(${r}) is deprecated`);
  } };
  for (const u of uses) {
    if (u.prop) {
      if (rawColor(u.value)) add('c', u.where, `${u.prop}: ${u.value}  raw colour literal`);
      checkVars(u.value, u.where);
      const cat = CATS.find(([, p]) => p.test(u.prop));
      if (cat && !NEUTRAL.test(u.value)) count(cat[0], /var\(--/.test(u.value) && !cat[2](u.value));
      continue;
    }
    if (u.line !== undefined) {
      if (rawColor(u.line)) { add('c', u.where, `raw colour literal: ${u.line.trim().slice(0, 80)}`); count('color', false); }
      checkVars(u.line, u.where);
    }
    for (const raw of u.classes) {
      const c = raw.replace(/^(?:[\w-]+:)*!?/, '');
      if (PALETTE_CLASS.test(c) && COLOR_UTIL.test(c)) { add('c', u.where, `${raw}  palette utility; use the semantic colour utility`); count('color', false); continue; }
      if (ARBITRARY.test(c)) add('c', u.where, `${raw}  arbitrary value; add or use a token`);
      const m = c.match(COLOR_UTIL);
      if (m && (base.has(`--color-${m[1]}`) || /^\(--[\w-]+\)$/.test(m[1]))) { count('color', true); continue; }
      if (m && ARBITRARY.test(c) && rawColor(c)) { count('color', false); continue; }
      const t = TW.find(([, on, off]) => on.test(c) || off.test(c));
      if (t) count(t[0], t[1].test(c));
    }
  }
  for (const [cat, [ok, n]] of Object.entries(cov)) if (n && (100 * ok) / n < minCoverage) add('d', cat, `${Math.round((100 * ok) / n)}% tokenized, below --min-coverage ${minCoverage}`);

  // [e] DTCG shape.
  for (const { t, path } of dtcg) { const msg = shape(t, all); if (msg) add('e', `${path} ${t.path.join('.')}`, msg); }

  // [f] Token hygiene (--hygiene): semantic $description (when + when never) and dead token detection.
  if (hygiene) {
    for (const { t, path } of dtcg) {
      const name = '--' + t.path.join('-');
      const isAlias = typeof t.value === 'string' && ALIAS.test(t.value);
      if (isAlias && !prim.has(name) && !ramp.has(name) && !comp.has(name) && !fileAxis(path)) {
        const desc = typeof t.description === 'string' ? t.description.trim() : '';
        if (!desc) add('f', `${path} ${t.path.join('.')}`, 'semantic token lacks $description (state both when and when never to use it)');
        else if (!/\b(?:never|not|avoid|except|do not|don't|only)\b/i.test(desc)) {
          add('f', `${path} ${t.path.join('.')}`, '$description states when to use, but lacks a boundary ("never" / "not" / "only")');
        }
      }
    }
    if (uses.length > 0) {
      const readTokens = new Set();
      for (const d of defs) for (const r of d.refs) readTokens.add(r);
      for (const u of uses) {
        if (u.value) for (const r of VARS(u.value)) readTokens.add(r);
        if (u.line) for (const r of VARS(u.line)) readTokens.add(r);
        for (const raw of u.classes ?? []) {
          const c = raw.replace(/^(?:[\w-]+:)*!?/, '');
          const m = c.match(COLOR_UTIL);
          if (m) {
            if (/^\(--[\w-]+\)$/.test(m[1])) readTokens.add(m[1].slice(1, -1));
            else readTokens.add(`--color-${m[1]}`);
          }
        }
      }
      for (const d of base.values()) {
        if (prim.has(d.name) || ramp.has(d.name) || deprecated.has(d.name)) continue;
        if (!readTokens.has(d.name)) add('f', d.where, `${d.name} has 0 consumers across scanned stylesheets and components (dead token)`);
      }
    }
  }
  return { F, cov };
}

function report({ F, cov }) {
  const titles = { a: 'key sets per axis value', b: 'override blocks', c: 'tier violations in components', d: 'coverage below threshold', e: 'DTCG shape', f: 'token hygiene (descriptions & dead tokens)' };
  const lines = [];
  for (const k of 'abc') if (F[k].length) lines.push(`[${k}] ${titles[k]}: ${F[k].length}`, ...F[k].slice(0, 60).map((f) => '  ' + f), ...(F[k].length > 60 ? [`  ... ${F[k].length - 60} more`] : []));
  const covLine = Object.entries(cov).filter(([, [, n]]) => n).map(([c, [ok, n]]) => `${c} ${Math.round((100 * ok) / n)}% (${ok}/${n})`).join('  ');
  lines.push(`[d] coverage, tokenized / all declarations and utilities, token definitions excluded: ${covLine || 'nothing to measure'}`, ...F.d.map((f) => '  ' + f));
  if (F.e.length) lines.push(`[e] ${titles.e}: ${F.e.length}`, ...F.e.map((f) => '  ' + f));
  if (F.f?.length) lines.push(`[f] ${titles.f}: ${F.f.length}`, ...F.f.map((f) => '  ' + f));
  const n = Object.values(F).reduce((s, x) => s + x.length, 0);
  lines.push(n ? `check-tokens: ${n} finding(s)` : 'check-tokens: no findings');
  return { text: lines.join('\n'), n };
}

function selfTest() {
  const css = (path, text) => ({ path, text });
  const cases = [
    { name: 'clean three-tier system with a scoped brand', expect: {}, files: [
      css('tokens.css', `:root { --blue-500: oklch(0.62 0.19 260); --blue-600: oklch(0.54 0.19 260); --green-600: oklch(0.54 0.17 150); --neutral-50: oklch(0.98 0 0); --neutral-900: oklch(0.2 0 0);
        --accent-600: var(--blue-600); --translate-enter: 4px; color-scheme: light dark; }
        :root, [data-brand] { --color-accent-solid: light-dark(var(--accent-600), var(--blue-500)); --color-bg-surface: light-dark(var(--neutral-50), var(--neutral-900)); }
        [data-brand="acme"] { --accent-600: var(--green-600); }
        [data-theme="dark"] { color-scheme: dark; }
        @media (prefers-reduced-motion: reduce) { :root { --translate-enter: 0px; } }`),
      css('card.css', `.card { background: var(--color-bg-surface); padding: 0; }`),
      css('Button.tsx', `export const B = () => <button className="bg-accent-solid p-4 rounded-lg">Go</button>;`)] },
    { name: 'dark block missing a key, two mechanisms disagree', expect: { a: 2 }, files: [
      css('globals.css', `:root { --neutral-50: #fafafa; --neutral-900: #171717; --color-bg: var(--neutral-50); --color-border: var(--neutral-50); --color-text: var(--neutral-900); }
        .dark { --color-bg: var(--neutral-900); --color-border: var(--neutral-900); }
        @media (prefers-color-scheme: dark) { :root:not(.light) { --color-bg: var(--neutral-900); } }`)] },
    { name: 'primitive override, subtree brand, zeroed duration', expect: { b: 3 }, files: [
      css('tokens.css', `:root { --blue-600: #2563eb; --green-600: #16a34a; --accent-600: var(--blue-600); --color-accent-solid: var(--accent-600); --duration-press: 120ms; }
        [data-brand="acme"] { --accent-600: var(--green-600); --blue-600: #1d4ed8; }
        @media (prefers-reduced-motion: reduce) { :root { --duration-press: 0ms; } }`)] },
    { name: 'override of an @theme inline variable', expect: { b: 1 }, files: [
      css('app.css', `@theme inline { --color-surface: var(--surface); }
        :root { --surface: oklch(1 0 0); } .dark { --surface: oklch(0.2 0 0); --color-surface: oklch(0.3 0 0); }`)] },
    { name: 'tier violations in CSS and TSX', expect: { c: 5 }, files: [
      css('tokens.css', `:root { --blue-600: #2563eb; --color-accent-solid: var(--blue-600); }`),
      css('card.css', `.card { color: #333; background: var(--blue-600); padding: 13px; }`),
      css('Button.tsx', `<button className="bg-blue-600 p-[13px] hover:text-accent-solid" style={{ borderColor: 'rgb(0 0 0)' }} />`)] },
    { name: 'DTCG shape and key sets', expect: { a: 1, e: 7 }, files: [
      css('tokens/base.tokens.json', JSON.stringify({ color: { $type: 'color', blue: { 600: { $value: '#2563eb' } }, ok: { $value: { colorSpace: 'srgb', components: [0, 0, 1] } },
        bad: { $value: { colorSpace: 'rgb', components: [0, 0] } }, accent: { $value: '{color.blue.700}' } },
        space: { 4: { $type: 'dimension', $value: '16px' }, 5: { $type: 'dimension', $value: { value: 20 } } }, orphan: { $description: 'no value' }, size: { 1: { $value: { value: 4, unit: 'px' } } } })),
      css('tokens/mode.light.tokens.json', JSON.stringify({ color: { $type: 'color', text: { $value: '{color.ok}' }, border: { $value: '{color.ok}' } } })),
      css('tokens/mode.dark.tokens.json', JSON.stringify({ color: { $type: 'color', text: { $value: '{color.ok}' } } }))] },
    { name: 'hygiene: line-height px unit, missing when-never description, dead token', opts: { hygiene: true }, expect: { e: 1, f: 2 }, files: [
      css('tokens/primitives.tokens.json', JSON.stringify({ color: { $type: 'color', blue: { 600: { $value: { colorSpace: 'srgb', components: [0.1, 0.3, 0.9] } } } }, leading: { body: { $type: 'dimension', $value: { value: 24, unit: 'px' } } } })),
      css('tokens/semantic.tokens.json', JSON.stringify({ color: { $type: 'color', accent: { $value: '{color.blue.600}', $description: 'Primary action fill' }, unusedRole: { $value: '{color.blue.600}', $description: 'Use for callouts; never use for cards' } } })),
      css('src/App.css', `.btn { background: var(--color-accent); }`)] },
  ];
  const failed = [];
  for (const c of cases) {
    const { F } = analyse(c.files, c.opts);
    const got = Object.fromEntries(Object.entries(F).filter(([, v]) => v.length).map(([k, v]) => [k, v.length]));
    if (JSON.stringify(got) === JSON.stringify(Object.fromEntries(Object.entries(c.expect).sort()))) continue;
    failed.push(`${c.name}: expected ${JSON.stringify(c.expect)}, got ${JSON.stringify(got)}\n    ${Object.values(F).flat().join('\n    ')}`);
  }
  if (failed.length) { console.error('self-test FAILED:\n  ' + failed.join('\n  ')); process.exit(1); }
  console.log(`self-test OK (${cases.length} fixtures: clean, key sets, overrides, tier violations, DTCG shape)`);
}

function walk(p, out = []) {
  const s = statSync(p);
  if (s.isDirectory()) { for (const f of readdirSync(p)) if (!SKIP_DIR.test(f)) walk(join(p, f), out); }
  else if ((SOURCE.test(p) && !NOT_SOURCE.test(p)) || /\.tokens(?:\.json)?$/.test(p)) out.push(p);
  return out;
}

const args = process.argv.slice(2);
if (args[0] === '--self-test') selfTest();
else if (!args.length || args[0] === '--help' || args[0] === '-h') console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 10).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
else {
  const i = args.indexOf('--min-coverage'); const minCoverage = i >= 0 ? Number(args.splice(i, 2)[1]) : 0;
  const h = args.indexOf('--hygiene'); const hygiene = h >= 0 ? (args.splice(h, 1), true) : false;
  try {
    const files = args.flatMap((a) => walk(a)).map((p) => ({ path: /^\.\.|^$/.test(relative(process.cwd(), p)) ? p : relative(process.cwd(), p), text: readFileSync(p, 'utf8') }));
    const r = report(analyse(files, { minCoverage, hygiene }));
    console.log(r.text);
    process.exit(r.n ? 1 : 0);
  } catch (e) { console.error(e.message); process.exit(2); }
}

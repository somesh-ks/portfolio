#!/usr/bin/env node
// Generates a product's motion tokens and lints motion code. No dependencies.
//
//   node motion-tokens.mjs --out ./tokens/motion [--config motion.config.json]   write every output
//   node motion-tokens.mjs --print [--config motion.config.json]                 DTCG JSON to stdout
//   node motion-tokens.mjs --spring "visualDuration=0.35,bounce=0.15"            spring facts + CSS linear()
//   node motion-tokens.mjs --spring "stiffness=300,damping=20,mass=1"
//   node motion-tokens.mjs --check src/ styles/app.css                           lint motion code
//   node motion-tokens.mjs --self-test                                           check the maths
//
// Defaults and names follow ~/.agents/DESIGN.md and CODE.md (--duration-press, --ease-out, --stagger-step).
// Motion has no primitive ramp: each duration is named by the element class DESIGN.md times, and
// easings by the curve names DESIGN.md defines. Springs are converted exactly as Motion (motion.dev) does:
// visualDuration and bounce map to stiffness and damping with mass 1, and the CSS linear() curve is
// sampled every 10 ms over the time Motion takes to settle.

import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

// ---------- defaults (DESIGN.md) ----------

const DEFAULTS = {
  prefix: '',
  extensionsKey: 'dev.local.motion',
  personality: 'crisp', // crisp | friendly | playful
  ceilingMs: 300,
  drawerMs: 500,
  easings: {
    out: [0.23, 1, 0.32, 1],
    'in-out': [0.77, 0, 0.175, 1],
    drawer: [0.32, 0.72, 0, 1],
  },
  translates: { nudge: 4, enter: 8, reveal: 12, panel: 24 },
  staggerMs: 40,
  scales: { enter: 0.95, popover: 0.97, press: 0.97 },
  blurPx: 2,
};

// Element classes from DESIGN.md's duration table. Exits run one step shorter than entrances, because
// the user has already decided. `ease` is a curve above or a CSS keyword (`ease` for hover and colour).
const ELEMENTS = {
  press: { enter: 150, ease: 'out', note: 'Press and toggle feedback on any pressable element.' },
  hover: { enter: 150, ease: 'ease', note: 'Hover and colour changes, with the CSS ease keyword.' },
  tooltip: { enter: 150, exit: 100, ease: 'out', note: 'Tooltips and small popovers.' },
  dropdown: { enter: 200, exit: 150, ease: 'out', note: 'Dropdowns, selects, popovers, and accordions.' },
  modal: { enter: 250, exit: 200, ease: 'out', note: 'Modals, panels, and toasts.' },
  page: { enter: 300, exit: 250, ease: 'out', note: 'View and route changes.' },
  move: { enter: 250, ease: 'in-out', note: 'Elements moving or morphing on screen: tab indicators, reorders.' },
  drawer: { enter: 500, exit: 300, ease: 'drawer', note: 'Full-height drawers and sheets, with --ease-drawer only.' },
};
const RANGES = { press: [100, 160], tooltip: [125, 200], dropdown: [150, 250], modal: [200, 300] }; // DESIGN.md
const KEYWORDS = { ease: [0.25, 0.1, 0.25, 1], linear: [0, 0, 1, 1] };

// Bounce falls as surfaces grow (weight lives in starts and stops).
const PERSONALITY = {
  crisp: { snappy: [0.25, 0], gentle: [0.35, 0.05], playful: [0.4, 0.15] },
  friendly: { snappy: [0.25, 0.05], gentle: [0.35, 0.15], playful: [0.4, 0.25] },
  playful: { snappy: [0.25, 0.1], gentle: [0.35, 0.2], playful: [0.45, 0.3] },
};

const NOTES = {
  ease: { out: 'Entering and exiting: starts fast, feels responsive.', 'in-out': 'On-screen movement and morphing.', drawer: 'Full-height drawers only.' },
  translate: { nudge: 'In-place text or icon swaps.', enter: 'Entrance travel for toasts and list items.', reveal: 'Text and section reveals.', panel: 'Panels sliding into a region.' },
  scale: { enter: 'Entrances such as modals start from this scale.', popover: 'Popovers, dropdowns, and tooltips scale from this, at their trigger.', press: 'Pressed state of any pressable element.' },
};
const note = (group, k) => ({ $description: NOTES[group][k] || `Project ${group} token: say when to use it.` });

// ---------- small helpers ----------

const round = (n, d = 4) => Math.round(n * 10 ** d) / 10 ** d;
const fail = (msg) => { throw new Error(msg); };

function loadConfig(path) {
  const user = path ? JSON.parse(readFileSync(path, 'utf8')) : {};
  for (const old of ['durations', 'distances', 'components']) if (user[old]) fail(`config key "${old}" was replaced by "elements" and "translates"; see references/motion-tokens.md`);
  const cfg = { ...DEFAULTS, ...user, easings: { ...DEFAULTS.easings, ...(user.easings || {}) }, scales: { ...DEFAULTS.scales, ...(user.scales || {}) }, translates: { ...DEFAULTS.translates, ...(user.translates || {}) } };
  if (!PERSONALITY[cfg.personality] && !user.springs) fail(`personality must be one of ${Object.keys(PERSONALITY).join(', ')}`);
  cfg.springs = user.springs || Object.fromEntries(Object.entries(PERSONALITY[cfg.personality]).map(([k, [visualDuration, bounce]]) => [k, { visualDuration, bounce }]));
  cfg.elements = Object.fromEntries(Object.keys({ ...ELEMENTS, ...(user.elements || {}) }).map((k) => [k, { ...ELEMENTS[k], ...(user.elements || {})[k] }]));
  for (const [k, e] of Object.entries(cfg.elements)) {
    if (!(e.enter > 0)) fail(`elements.${k} needs an enter duration in ms`);
    if (!cfg.easings[e.ease] && !KEYWORDS[e.ease]) fail(`elements.${k}: ease "${e.ease}" is neither a curve in easings nor ease or linear`);
  }
  return cfg;
}

// ---------- cubic-bezier ----------

// Speed at the start and end in multiples of the average speed; an accelerating start is an ease-in shape.
function bezierSpeeds([x1, y1, x2, y2]) {
  const start = x1 > 0 ? y1 / x1 : x2 > 0 ? y2 / x2 : Infinity;
  const end = x2 < 1 ? (1 - y2) / (1 - x2) : x1 < 1 ? (1 - y1) / (1 - x1) : Infinity;
  return { start, end };
}
const isEaseIn = (b) => { const { start, end } = bezierSpeeds(b); return start < 0.5 && end > 1; };

// ---------- springs (Motion-compatible) ----------

const bounceToDampingRatio = (bounce) => (bounce < 0 ? 1 / Math.max(1 + bounce, 0.05) : Math.max(1 - bounce, 0.05));

function resolveSpring(o) {
  if (o.stiffness !== undefined || o.damping !== undefined || o.mass !== undefined) {
    const stiffness = o.stiffness ?? 100, damping = o.damping ?? 10, mass = o.mass ?? 1;
    return { stiffness, damping, mass };
  }
  if (o.visualDuration === undefined) fail('a spring needs visualDuration (and bounce) or stiffness, damping, and mass');
  const zeta = bounceToDampingRatio(o.bounce ?? 0);
  if (zeta > 1) fail('negative bounce (overdamped) is not supported here; use bounce 0 or above');
  const root = (2 * Math.PI) / (o.visualDuration * 1.2);
  const stiffness = root * root;
  return { stiffness, damping: 2 * zeta * Math.sqrt(stiffness), mass: 1 };
}

// Position and velocity (per second) of a spring from 0 to 1 starting at rest.
function springAt({ stiffness: k, damping: c, mass: m }, t) {
  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const e = Math.exp(-zeta * w0 * t);
    const x = 1 - e * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
    const v = e * (w0 * w0 / wd) * Math.sin(wd * t);
    return { x, v };
  }
  if (zeta === 1) {
    const e = Math.exp(-w0 * t);
    return { x: 1 - e * (1 + w0 * t), v: w0 * w0 * t * e };
  }
  const r = Math.sqrt(zeta * zeta - 1);
  const r1 = -w0 * (zeta - r), r2 = -w0 * (zeta + r);
  const x = 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r1 - r2);
  const v = (r1 * r2 * (Math.exp(r1 * t) - Math.exp(r2 * t))) / (r1 - r2);
  return { x, v };
}

// Motion samples in 50 ms steps and stops when the spring is within 0.5% of the target and slower
// than 2% of the distance per second (its rest thresholds for a 0 to 100 easing curve).
function springFacts(options) {
  const p = resolveSpring(options);
  const zeta = p.damping / (2 * Math.sqrt(p.stiffness * p.mass));
  let settleMs = 0;
  for (; settleMs < 20000; settleMs += 50) {
    const { x, v } = springAt(p, settleMs / 1000);
    if (settleMs > 0 && Math.abs(1 - x) * 100 <= 0.5 && Math.abs(v) * 100 <= 2) break;
  }
  let peak = 0;
  for (let t = 0; t <= settleMs; t += 1) peak = Math.max(peak, springAt(p, t / 1000).x);
  const n = Math.max(Math.round(settleMs / 10), 2);
  const points = [];
  for (let i = 0; i < n; i++) points.push(round(springAt(p, (settleMs * i / (n - 1)) / 1000).x));
  points[points.length - 1] = 1;
  return {
    stiffness: round(p.stiffness, 3), damping: round(p.damping, 3), mass: p.mass,
    dampingRatio: round(zeta, 3),
    overshootPercent: round(Math.max(0, peak - 1) * 100, 1),
    cssDurationMs: settleMs,
    linear: `linear(${points.join(', ')})`,
  };
}

// ---------- build ----------

const ms = (v) => ({ value: v, unit: 'ms' });
const px = (v) => ({ value: v, unit: 'px' });
const curveOf = (cfg, ease) => cfg.easings[ease] || KEYWORDS[ease];

function build(cfg) {
  const X = cfg.extensionsKey;
  const tokens = { $schema: 'https://www.designtokens.org/schemas/2025.10/format.json' };
  // durations by element class; the curve each one pairs with is a contract note, not a token value
  tokens.duration = { $type: 'duration' };
  for (const [k, e] of Object.entries(cfg.elements)) {
    const pair = { $extensions: { [X]: { ease: e.ease } } };
    tokens.duration[k] = { $value: ms(e.enter), $description: e.note || `Project element ${k}: say when to use it.`, ...pair };
    if (e.exit) tokens.duration[`${k}-exit`] = { $value: ms(e.exit), $description: `Exit of ${k}, one step shorter than the entrance.`, ...pair };
  }
  tokens['stagger-step'] = { $type: 'duration', $value: ms(cfg.staggerMs), $description: 'Per-item delay in a staggered entrance: calc(var(--stagger) * var(--stagger-step)).' };
  tokens.ease = { $type: 'cubicBezier', ...Object.fromEntries(Object.entries(cfg.easings).map(([k, b]) => [k, { $value: b, ...note('ease', k) }])) };
  tokens.translate = { $type: 'dimension', ...Object.fromEntries(Object.entries(cfg.translates).map(([k, d]) => [k, { $value: px(d), ...note('translate', k) }])) };
  tokens.scale = { $type: 'number', ...Object.fromEntries(Object.entries(cfg.scales).map(([k, s]) => [k, { $value: s, ...note('scale', k) }])) };
  tokens.blur = { $type: 'dimension', enter: { $value: px(cfg.blurPx), $description: 'Optional blur on entrances; keep it small.' } };
  tokens.spring = {};
  const springs = {};
  for (const [name, o] of Object.entries(cfg.springs)) {
    const f = springFacts(o);
    springs[name] = { options: o, facts: f };
    tokens.spring[name] = {
      $type: 'duration',
      $value: ms(f.cssDurationMs),
      $description: `Spring: ${f.overshootPercent}% overshoot, damping ratio ${f.dampingRatio}. The value is the CSS duration of its linear() curve.`,
      $extensions: { [X]: { spring: { ...o, stiffness: f.stiffness, damping: f.damping, mass: f.mass }, linear: f.linear } },
    };
  }
  // reduced-motion mode: travel and scale go; durations, curves, stagger, and fades stay
  const reduced = {
    $schema: tokens.$schema,
    $description: 'Mode override for prefers-reduced-motion and data-motion="reduced". Fewer and gentler, not zero.',
    translate: { $type: 'dimension', ...Object.fromEntries(Object.keys(cfg.translates).map((k) => [k, { $value: px(0) }])) },
    scale: { $type: 'number', ...Object.fromEntries(Object.keys(cfg.scales).map((k) => [k, { $value: 1 }])) },
  };
  return { tokens, reduced, springs };
}

// ---------- emit ----------

const cssValue = (v) => {
  if (Array.isArray(v)) return `cubic-bezier(${v.join(', ')})`;
  if (v && typeof v === 'object' && 'unit' in v) return `${v.value}${v.unit}`;
  return String(v);
};

function walk(node, path, out) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue;
    if (v && typeof v === 'object' && '$value' in v) out.push([[...path, k], v]);
    else if (v && typeof v === 'object') walk(v, [...path, k], out);
  }
  return out;
}

function emitCss(cfg, tokens, reduced) {
  const P = cfg.prefix;
  const name = (path) => `--${P}${path.join('-')}`;
  const lines = walk(tokens, [], []).map(([path, t]) => (path[0] === 'spring'
    ? `  ${name(path)}: ${cssValue(t.$value)} ${t.$extensions[cfg.extensionsKey].linear};`
    : `  ${name(path)}: ${cssValue(t.$value)};`));
  const red = walk(reduced, [], []).map(([path, t]) => `  ${name(path)}: ${cssValue(t.$value)};`).join('\n');
  return [
    '/* Generated by motion-tokens.mjs. Do not edit; change the config and regenerate. */',
    ':root {', ...lines, '}',
    '',
    '/* Reduced motion: travel and scale go; durations, easing, stagger, and fades stay. */',
    '@media (prefers-reduced-motion: reduce) {', `  :root:not([data-motion="full"]) {\n${red.replace(/^/gm, '  ')}\n  }`, '}',
    ':root[data-motion="reduced"] {', red, '}',
    '',
    `/* Use: transition: opacity var(--${P}duration-dropdown) var(--${P}ease-out), transform var(--${P}duration-dropdown) var(--${P}ease-out); */`,
    '',
  ].join('\n');
}

function emitTailwind(cfg, tokens) {
  const dflt = cfg.elements.dropdown || Object.values(cfg.elements)[0];
  const lines = ['/* Generated by motion-tokens.mjs. Import after tailwindcss and motion.css. Tailwind v4 has no duration namespace: durations stay in motion.css, used as duration-(--duration-dropdown). */', '@theme {'];
  lines.push('  --ease-*: initial; /* drop Tailwind\'s default ease-in so it cannot be used */');
  for (const [k, b] of Object.entries(cfg.easings)) lines.push(`  --ease-${k}: ${cssValue(b)};`);
  lines.push(`  --default-transition-duration: ${dflt.enter}ms;`, `  --default-transition-timing-function: ${cssValue(curveOf(cfg, dflt.ease))};`);
  for (const [name] of Object.entries(cfg.springs)) {
    const t = tokens.spring[name];
    lines.push(`  --animate-spring-${name}-in: spring-${name}-in ${cssValue(t.$value)} ${t.$extensions[cfg.extensionsKey].linear} both;`);
  }
  lines.push('');
  for (const name of Object.keys(cfg.springs)) {
    lines.push(`  @keyframes spring-${name}-in {`, `    from { opacity: 0; scale: ${cfg.scales.enter}; }`, `    to { opacity: 1; scale: 1; }`, '  }');
  }
  lines.push('}', '', '@media (prefers-reduced-motion: reduce) {', '  [class*="animate-spring-"] { animation-name: none; }', '}', '');
  return lines.join('\n');
}

function emitMotion(cfg) {
  const camel = (s) => s.replace(/-(\w)/g, (_, c) => c.toUpperCase());
  const tr = {};
  for (const [k, e] of Object.entries(cfg.elements)) {
    const ease = curveOf(cfg, e.ease);
    tr[camel(k)] = { type: 'tween', duration: round(e.enter / 1000, 3), ease };
    if (e.exit) tr[camel(`${k}-exit`)] = { type: 'tween', duration: round(e.exit / 1000, 3), ease };
  }
  const compact = (o) => JSON.stringify(o, null, 2).replace(/\[\s+([^\]]*?)\s+\]/g, (_, inner) => `[${inner.split(/,\s+/).join(', ')}]`);
  const springs = Object.fromEntries(Object.entries(cfg.springs).map(([k, o]) => [k, o.visualDuration !== undefined ? { type: 'spring', visualDuration: o.visualDuration, bounce: o.bounce ?? 0 } : { type: 'spring', ...o }]));
  return [
    '// Generated by motion-tokens.mjs. Do not edit; change the config and regenerate.',
    '// <MotionConfig reducedMotion="user" transition={transitions.dropdown}> applies these app-wide.',
    `export const transitions = ${compact(tr)};`,
    '',
    `export const springs = ${compact(springs)};`,
    '',
    `export const stagger = ${round(cfg.staggerMs / 1000, 3)};`,
    '',
  ].join('\n');
}

// ---------- validation of a config against DESIGN.md ----------

function validate(cfg) {
  const issues = [];
  for (const [k, b] of Object.entries(cfg.easings)) {
    if (b.length !== 4 || b[0] < 0 || b[0] > 1 || b[2] < 0 || b[2] > 1) issues.push(`ease.${k}: x values must be in 0..1`);
    if (isEaseIn(b)) issues.push(`ease.${k}: accelerating start (ease-in shape) delays the moment the user watches`);
  }
  for (const [k, e] of Object.entries(cfg.elements)) {
    const drawer = e.ease === 'drawer';
    if (e.enter > (drawer ? cfg.drawerMs : cfg.ceilingMs)) issues.push(`duration.${k}: ${e.enter}ms is over the ${drawer ? cfg.drawerMs : cfg.ceilingMs}ms ceiling${drawer ? '' : ` (only a drawer on ease.drawer may reach ${cfg.drawerMs}ms)`}`);
    if (e.exit && e.exit >= e.enter) issues.push(`duration.${k}-exit: exits run shorter than entrances`);
    const r = RANGES[k];
    if (r && (e.enter < r[0] || e.enter > r[1])) issues.push(`duration.${k}: ${e.enter}ms is outside DESIGN.md's ${r[0]} to ${r[1]}ms`);
  }
  if (cfg.staggerMs < 30 || cfg.staggerMs > 80) issues.push(`stagger ${cfg.staggerMs}ms: keep 30 to 80ms`);
  for (const [k, o] of Object.entries(cfg.springs)) if ((o.bounce ?? 0) > 0.3) issues.push(`spring.${k}: bounce over 0.3 reads as a toy in product UI`);
  if (cfg.scales.enter < 0.9) issues.push('scale.enter below 0.9 reads as a zoom; start from 0.95');
  if (cfg.blurPx > 8) issues.push('blur over 8px is expensive on large surfaces');
  return issues;
}

// ---------- lint ----------

const LINT_EXT = new Set(['.css', '.scss', '.less', '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.html', '.astro', '.mdx']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage']);

function files(paths) {
  const out = [];
  const visit = (p) => {
    const s = statSync(p);
    if (s.isDirectory()) { for (const e of readdirSync(p)) if (!SKIP_DIRS.has(e)) visit(join(p, e)); }
    else if (LINT_EXT.has(extname(p))) out.push(p);
  };
  paths.forEach(visit);
  return out;
}

function lintText(text, file = '<text>') {
  const findings = [];
  const add = (i, rule, severity, msg) => findings.push({ file, line: text.slice(0, i).split('\n').length, rule, severity, message: msg });
  let m;
  const scan = (re, fn) => { re.lastIndex = 0; while ((m = re.exec(text))) fn(m); };
  // DESIGN.md allows ease-in only for an element leaving for good (swipe, dismiss) in 200ms or less.
  const leavingForGood = (i) => {
    const end = text.slice(i).search(/[;}]/);
    const decl = text.slice(Math.max(0, text.lastIndexOf('{', i) - 80), end < 0 ? undefined : i + end);
    const dur = decl.match(/(\d*\.?\d+)(ms|s)\b/);
    const ms = dur ? (dur[2] === 's' ? Number(dur[1]) * 1000 : Number(dur[1])) : Infinity;
    return /dismiss|swip|leav|fling|remov/i.test(decl) && ms <= 200;
  };
  scan(/\bease-in\b(?!-out)/g, (x) => {
    const before = text.slice(Math.max(0, x.index - 30), x.index);
    if (/--$|ease-in-out|[\w-]$/.test(before) || leavingForGood(x.index)) return;
    add(x.index, 'no-ease-in', 'error', 'ease-in on UI delays the moment the user watches; use ease-out (DESIGN.md allows ease-in only for elements leaving for good, 200ms or less)');
  });
  scan(/["']easeIn["']/g, (x) => add(x.index, 'no-ease-in', 'error', 'easeIn in a JS animation; use easeOut or a spring'));
  scan(/cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/g, (x) => {
    const b = x.slice(1).map(Number);
    if (isEaseIn(b)) add(x.index, 'no-ease-in', 'error', `cubic-bezier(${b.join(', ')}) starts slow (an ease-in shape)`);
  });
  scan(/transition(?:-property)?\s*:\s*all\b/g, (x) => add(x.index, 'no-transition-all', 'error', 'transition: all animates unintended properties; list them'));
  scan(/\bscale\(\s*0\s*\)|\bscale\s*:\s*0\s*[;}"']/g, (x) => add(x.index, 'no-scale-zero', 'error', 'scale(0) entrance; start from scale 0.95 with opacity 0'));
  scan(/(?:transition|animation)(?:-duration)?\s*:[^;{}]*?(\d*\.?\d+)(ms|s)\b/g, (x) => {
    const v = x[2] === 's' ? Number(x[1]) * 1000 : Number(x[1]);
    const end = text.slice(x.index).search(/[;}]/);
    const decl = text.slice(x.index, end < 0 ? undefined : x.index + end);
    const selector = text.slice(Math.max(0, text.lastIndexOf('{', x.index) - 80), x.index);
    const drawer = /drawer|sheet/i.test(decl + selector) && v <= 500;
    if (v > 300 && !drawer && !/linear\(|infinite/.test(decl)) add(x.index, 'duration-ceiling', 'warn', `${v}ms is over the 300ms UI ceiling (drawers may reach 500ms)`);
  });
  scan(/--ease-out\s*:\s*ease-out\b/g, (x) => add(x.index, 'ease-out-collision', 'warn', '--ease-out is the weak keyword here but cubic-bezier(0.23, 1, 0.32, 1) in DESIGN.md; rename one'));
  scan(/\bwill-change\s*:\s*(?!auto)[^;]*\b(?:top|left|width|height|all)\b/g, (x) => add(x.index, 'will-change-layout', 'warn', 'will-change on a layout property; animate transform instead'));
  scan(/(?:transition|animation)[^;{}]*\b(?:width|height|top|left|margin|padding)\b[^;{}]*\d(?:ms|s)\b/g, (x) => {
    if (!/grid-template-rows|interpolate-size/.test(x[0])) add(x.index, 'layout-property', 'warn', 'animating a layout property; use transform (accordions may animate height or grid rows)');
  });
  return findings;
}

function lint(paths) {
  const list = files(paths);
  const findings = [];
  let animates = false, reducedMotion = false;
  for (const f of list) {
    const text = readFileSync(f, 'utf8');
    if (/\b(?:transition|animation|@keyframes|animate\(|motion\.)/.test(text)) animates = true;
    if (/prefers-reduced-motion|useReducedMotion|reducedMotion/.test(text)) reducedMotion = true;
    findings.push(...lintText(text, f));
  }
  if (animates && !reducedMotion) findings.push({ file: paths.join(' '), line: 0, rule: 'reduced-motion', severity: 'error', message: 'motion found but no prefers-reduced-motion handling anywhere in the scanned files' });
  return { scanned: list.length, errors: findings.filter((x) => x.severity === 'error').length, warnings: findings.filter((x) => x.severity === 'warn').length, findings };
}

// ---------- self-test ----------

function selfTest() {
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  const checks = {};
  const s1 = springFacts({ stiffness: 100, damping: 10, mass: 1 });
  checks['default spring damping ratio 0.5'] = s1.dampingRatio === 0.5;
  checks['default spring overshoot 16.3%'] = near(s1.overshootPercent, 16.3, 0.1);
  // Reference values produced by motion-dom 14.1.0 (createGeneratorEasing + generateLinearEasing)
  const s2 = springFacts({ visualDuration: 0.35, bounce: 0.15 });
  checks['visualDuration 0.35 bounce 0.15 settles at 600ms like Motion'] = s2.cssDurationMs === 600;
  checks['first samples match Motion'] = s2.linear.startsWith('linear(0, 0.0106, 0.039, 0.0804, 0.1311');
  checks['stiffness 100 settles at 1050ms like Motion'] = s1.cssDurationMs === 1050;
  checks['visualDuration 0.25 bounce 0 settles at 450ms like Motion'] = springFacts({ visualDuration: 0.25, bounce: 0 }).cssDurationMs === 450;
  checks['stiffness 600 damping 15 settles at 800ms like Motion'] = springFacts({ stiffness: 600, damping: 15, mass: 1 }).cssDurationMs === 800;
  checks['bounce 0.2 is damping ratio 0.8'] = bounceToDampingRatio(0.2) === 0.8;
  checks['critical damping does not overshoot'] = springFacts({ visualDuration: 0.3, bounce: 0 }).overshootPercent === 0;
  checks['strong ease-out starts at 4.35x average speed'] = near(bezierSpeeds([0.23, 1, 0.32, 1]).start, 4.348, 0.001);
  checks['ease-in shape detected'] = isEaseIn([0.42, 0, 1, 1]) && isEaseIn([0.5, 0.05, 0.75, 0.2]);
  checks['ease-in-out and ease-out not flagged'] = !isEaseIn([0.77, 0, 0.175, 1]) && !isEaseIn([0.23, 1, 0.32, 1]) && !isEaseIn([0.25, 0.1, 0.25, 1]);
  const bad = '.a{transition:all 300ms ease-in}.b{transform:scale(0)}.c{transition: opacity 450ms ease-out}.d{transition: transform 200ms cubic-bezier(0.77,0,0.175,1)}:root{--ease-out: ease-out}';
  const rules = lintText(bad).map((f) => f.rule);
  checks['lint finds ease-in, all, scale(0), 450ms, collision'] = ['no-ease-in', 'no-transition-all', 'no-scale-zero', 'duration-ceiling', 'ease-out-collision'].every((r) => rules.includes(r));
  checks['lint allows a short ease-in on a dismissed element'] = lintText('.toast[data-dismissed]{transition: transform 180ms ease-in}').length === 0 && lintText('.menu{transition: opacity 180ms ease-in}').some((f) => f.rule === 'no-ease-in');
  checks['lint allows a 500ms drawer'] = lintText('.drawer{transition: transform 500ms var(--ease-drawer)}').length === 0;
  checks['lint passes ease-in-out curve and token names'] = lintText('.d{transition: transform 200ms var(--ease-in-out)} .e{transition-timing-function: ease-in-out}').length === 0;
  const cfg = loadConfig();
  const { tokens, reduced } = build(cfg);
  const css = emitCss(cfg, tokens, reduced);
  checks['names match CODE.md and DESIGN.md'] = ['--duration-press:', '--duration-dropdown:', '--stagger-step:', '--ease-out:', '--ease-drawer:', '--translate-enter:', '--scale-press:', '[data-motion="reduced"]'].every((s) => css.includes(s)) && !/--ease-(?:enter|exit|move|hover)\b/.test(css);
  checks['every token has a description'] = walk(tokens, [], []).every(([, t]) => typeof t.$description === 'string' && t.$description.length > 3);
  checks['dropdown is 200ms on the strong ease-out'] = tokens.duration.dropdown.$value.value === 200 && JSON.stringify(curveOf(cfg, tokens.duration.dropdown.$extensions[cfg.extensionsKey].ease)) === '[0.23,1,0.32,1]';
  checks['exit is shorter than enter'] = tokens.duration['modal-exit'].$value.value < tokens.duration.modal.$value.value;
  checks['defaults pass DESIGN.md validation'] = validate(cfg).length === 0;
  checks['a 400ms dropdown fails validation'] = validate({ ...cfg, elements: { ...cfg.elements, dropdown: { ...cfg.elements.dropdown, enter: 400 } } }).some((i) => i.startsWith('duration.dropdown'));
  checks['reduced mode zeroes travel and keeps time'] = reduced.translate.enter.$value.value === 0 && reduced.scale.enter.$value === 1 && !reduced.duration && !reduced['stagger-step'];
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  if (failed.length) { console.error('self-test FAILED:\n  ' + failed.join('\n  ')); process.exit(1); }
  console.log(`self-test OK (${Object.keys(checks).length} checks)`);
}

// ---------- CLI ----------

function parseSpring(arg) {
  const o = Object.fromEntries(arg.split(',').map((kv) => kv.split('=').map((s) => s.trim())).map(([k, v]) => [k, Number(v)]));
  if (Object.values(o).some(Number.isNaN)) fail('usage: --spring "visualDuration=0.35,bounce=0.15" or "stiffness=300,damping=20,mass=1"');
  return o;
}

const args = process.argv.slice(2);
const opt = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
try {
  if (args[0] === '--self-test') selfTest();
  else if (args[0] === '--spring') console.log(JSON.stringify(springFacts(parseSpring(args[1] || '')), null, 2));
  else if (args[0] === '--check') {
    const res = lint(args.slice(1).length ? args.slice(1) : ['.']);
    console.log(JSON.stringify(res, null, 2));
    process.exit(res.errors ? 1 : 0);
  } else if (args.includes('--out') || args.includes('--print')) {
    const cfg = loadConfig(opt('--config'));
    const issues = validate(cfg);
    const { tokens, reduced, springs } = build(cfg);
    if (args.includes('--print')) console.log(JSON.stringify({ issues, tokens, reduced }, null, 2));
    else {
      const dir = opt('--out');
      mkdirSync(dir, { recursive: true });
      const out = {
        'motion.tokens.json': JSON.stringify(tokens, null, 2) + '\n',
        'motion.reduced.tokens.json': JSON.stringify(reduced, null, 2) + '\n',
        'motion.css': emitCss(cfg, tokens, reduced),
        'motion.tailwind.css': emitTailwind(cfg, tokens),
        'motion.presets.js': emitMotion(cfg),
      };
      for (const [f, text] of Object.entries(out)) writeFileSync(join(dir, f), text);
      console.log(JSON.stringify({ wrote: Object.keys(out).map((f) => join(dir, f)), issues, springs: Object.fromEntries(Object.entries(springs).map(([k, s]) => [k, { ...s.options, overshootPercent: s.facts.overshootPercent, cssDurationMs: s.facts.cssDurationMs }])) }, null, 2));
    }
    if (issues.length) process.exit(2);
  } else fail('usage: motion-tokens.mjs --out <dir> [--config file] | --print | --spring "..." | --check <paths> | --self-test');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

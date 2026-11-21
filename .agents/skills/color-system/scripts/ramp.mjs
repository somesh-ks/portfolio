#!/usr/bin/env node
// Builds an OKLCH ramp from a seed colour and measures contrast. No dependencies. Run with --help.

const HELP = `Usage:
  node ramp.mjs <colour>                         ramp, gamut check and text pairs for every step
  node ramp.mjs <colour> --dark [--page <colour>]  add a dark appearance measured on a dark page
  node ramp.mjs --pairs "<fg>:<bg>,<fg>:<bg>"    measure foreground:background pairs
  node ramp.mjs --self-test                      check the maths against known values
  node ramp.mjs --help

<colour> is hex (#3b82f6, #38f), rgb(59 130 246), hsl(217 91% 60%) or oklch(0.623 0.188 259.8)
with L as 0-1 or a percentage. Quote it in the shell. An oklch() outside sRGB is mapped into it by
lowering chroma at the same L and H, and the output says so. Translucent colours are refused:
measure the colour composited over its background instead.

Output is JSON, one line per step. wcag is a ratio. apca is Lc, signed: negative means light text
on a dark background, so compare the absolute value. The seed is pinned on the step nearest its
OKLCH L, so a light seed such as yellow lands on a light step. Every other step holds the seed hue
and the seed's share of the in-gamut maximum chroma at that step's L, capped at the seed's chroma.
A seed under 0.002 chroma gives a neutral ramp. --dark keeps 85% of each step's chroma, measures
every step on --page (default #0a0a0a) and names the darkest step usable as accent text, by WCAG
alone and by WCAG plus APCA Lc 60.`;

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const TARGET_L = [0.971, 0.932, 0.882, 0.812, 0.722, 0.623, 0.535, 0.445, 0.362, 0.289, 0.215];
const ACHROMATIC = 0.002; // below this chroma the hue angle is rounding noise
const DARK_CHROMA = 0.85;
const DEFAULT_PAGE = '#0a0a0a';

const round = (n, d = 3) => Number(n.toFixed(d)) || 0;
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3 || h.length === 4) h = [...h].map((x) => x + x).join('');
  if (!/^([0-9a-f]{6}|[0-9a-f]{8})$/i.test(h)) throw new Error(`cannot read colour: ${hex} (run --help)`);
  if (h.length === 8 && h.slice(6).toLowerCase() !== 'ff') throw new Error(`translucent colour ${hex}: measure it composited over its background`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

function rgbToHex(rgb) {
  return '#' + rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('');
}

function rgbToOklch(rgb) {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), H: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
}

function oklchToLinearRgb({ L, C, H }) {
  const a = C * Math.cos(H * Math.PI / 180);
  const b = C * Math.sin(H * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inSrgb = (lch) => oklchToLinearRgb(lch).every((c) => c >= -0.0005 && c <= 1.0005);
const oklchToHex = (lch) => rgbToHex(oklchToLinearRgb(lch).map((c) => toGamma(Math.min(1, Math.max(0, c)))));

function maxChroma(L, H) {
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inSrgb({ L, C: mid, H })) lo = mid;
    else hi = mid;
  }
  return lo;
}

function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

// Reads hex, rgb(), hsl() or oklch(). Returns { lch, hex, notes }.
function parseColor(input) {
  const text = String(input).trim().toLowerCase();
  const fn = text.match(/^(rgba?|hsla?|oklch)\((.*)\)$/);
  if (!fn) {
    const rgb = hexToRgb(text);
    return { lch: rgbToOklch(rgb), hex: rgbToHex(rgb), notes: [] };
  }
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  const num = (p, percentOf = 1) => {
    const n = parseFloat(p);
    if (!Number.isFinite(n)) throw new Error(`cannot read colour: ${input}`);
    return p.endsWith('%') ? (n / 100) * percentOf : n;
  };
  if (parts.length < 3 || parts.length > 4) throw new Error(`cannot read colour: ${input}`);
  if (parts[3] !== undefined && num(parts[3]) < 1) throw new Error(`translucent colour ${input}: measure it composited over its background`);
  const hue = (p) => (p === 'none' ? 0 : ((num(p.replace(/deg$/, '')) % 360) + 360) % 360);
  if (fn[1].startsWith('rgb')) {
    const rgb = parts.slice(0, 3).map((p) => (p.endsWith('%') ? num(p) : num(p) / 255));
    if (rgb.some((c) => c < 0 || c > 1)) throw new Error(`rgb() channel out of range: ${input}`);
    return { lch: rgbToOklch(rgb), hex: rgbToHex(rgb), notes: [] };
  }
  if (fn[1].startsWith('hsl')) {
    const [s, l] = parts.slice(1, 3).map((p) => Math.min(1, Math.max(0, p.endsWith('%') ? num(p) : num(p) / 100)));
    const rgb = hslToRgb(hue(parts[0]), s, l);
    return { lch: rgbToOklch(rgb), hex: rgbToHex(rgb), notes: [] };
  }
  const lch = { L: Math.min(1, Math.max(0, num(parts[0]))), C: Math.max(0, num(parts[1], 0.4)), H: hue(parts[2]) };
  if (inSrgb(lch)) return { lch, hex: oklchToHex(lch), notes: [] };
  const mapped = { ...lch, C: maxChroma(lch.L, lch.H) };
  return { lch: mapped, hex: oklchToHex(mapped), notes: [`${input} is outside sRGB: mapped to ${css(mapped)} by lowering chroma at the same L and H`] };
}

// WCAG 2.x contrast ratio
function wcag(fg, bg) {
  const lum = (hex) => {
    const [r, g, b] = hexToRgb(hex).map(toLinear);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return round((a + 0.05) / (b + 0.05), 2);
}

// APCA lightness contrast (0.0.98G-4g constants). Positive: dark text on a light background.
function apca(text, bg) {
  const y = (hex) => {
    const [r, g, b] = hexToRgb(hex).map((c) => c ** 2.4);
    const v = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
    return v > 0.022 ? v : v + (0.022 - v) ** 1.414;
  };
  const [yt, yb] = [y(text), y(bg)];
  if (Math.abs(yb - yt) < 0.0005) return 0;
  if (yb > yt) {
    const s = (yb ** 0.56 - yt ** 0.57) * 1.14;
    return s < 0.1 ? 0 : round((s - 0.027) * 100, 1);
  }
  const s = (yb ** 0.65 - yt ** 0.62) * 1.14;
  return s > -0.1 ? 0 : round((s + 0.027) * 100, 1);
}

const measure = (fg, bg) => ({ wcag: wcag(fg, bg), apca: apca(fg, bg) });
function css({ L, C, H }) {
  return `oklch(${round(L)} ${round(C)} ${round(C) ? round(H, 1) : 0})`;
}

function ramp(input, { dark = false, page = DEFAULT_PAGE } = {}) {
  const { lch: raw, hex: seedHex, notes } = parseColor(input);
  const neutral = raw.C < ACHROMATIC;
  if (neutral) notes.push(`achromatic seed (chroma under ${ACHROMATIC}): every step is neutral and hue is irrelevant. For a tinted neutral, pass a seed that carries the tint, such as oklch(0.55 0.015 260).`);
  const seed = neutral ? { L: raw.L, C: 0, H: 0 } : raw;
  const share = Math.min(1, seed.C / Math.max(maxChroma(seed.L, seed.H), 1e-6));
  let seedIndex = 0;
  TARGET_L.forEach((t, i) => {
    if (Math.abs(t - seed.L) < Math.abs(TARGET_L[seedIndex] - seed.L)) seedIndex = i;
  });
  const steps = STEPS.map((step, i) => {
    if (i === seedIndex) return { step, lch: seed, hex: seedHex };
    const L = TARGET_L[i];
    return { step, lch: { L, C: Math.min(share * maxChroma(L, seed.H), seed.C), H: seed.H } };
  }).map((s) => ({ ...s, hex: s.hex ?? oklchToHex(s.lch) }));
  const lightest = steps[0].hex;
  const darkest = steps[steps.length - 1].hex;
  const result = {
    seed: { input: String(input), hex: seedHex, oklch: css(seed), step: STEPS[seedIndex], shareOfMaxChroma: round(share, 2) },
    ...(notes.length ? { notes } : {}),
    note: 'Seed pinned on the step nearest its OKLCH L. wcag is a ratio. apca is Lc: compare its absolute value; negative means light text on a dark background. Contrast belongs to the pair named, not to the step.',
    pairs: `whiteOn: #ffffff text on the step. darkestOn: ${darkest} text on the step. onWhite: the step as text on #ffffff. onDarkest: on ${darkest}. onLightest: on ${lightest}.`,
    ramp: steps.map((s) => ({
      step: s.step,
      hex: s.hex,
      oklch: css(s.lch),
      inSrgb: inSrgb(s.lch),
      whiteOn: measure('#ffffff', s.hex),
      darkestOn: measure(darkest, s.hex),
      onWhite: measure(s.hex, '#ffffff'),
      onDarkest: measure(s.hex, darkest),
      onLightest: measure(s.hex, lightest),
    })),
  };
  if (!dark) return result;
  const pageHex = parseColor(page).hex;
  const darkRamp = steps.map((s) => {
    const lch = { ...s.lch, C: s.lch.C * DARK_CHROMA };
    const hex = oklchToHex(lch);
    return { step: s.step, hex, oklch: css(lch), onPage: measure(hex, pageHex), whiteOn: measure('#ffffff', hex), pageOn: measure(pageHex, hex) };
  });
  const darkestStep = (ok) => [...darkRamp].reverse().find(ok)?.step ?? null;
  result.dark = {
    page: pageHex,
    chroma: `${DARK_CHROMA * 100}% of each light step`,
    accentText: {
      wcag: darkestStep((d) => d.onPage.wcag >= 4.5),
      wcagAndApca: darkestStep((d) => d.onPage.wcag >= 4.5 && Math.abs(d.onPage.apca) >= 60),
    },
    note: 'onPage: the step as text on the page; its wcag is also the fill-to-page ratio for the 3:1 non-text check. whiteOn and pageOn: a white or page-coloured label on the step as a fill. accentText.wcag: the darkest step reaching 4.5:1 on the page; accentText.wcagAndApca: the darkest that also reaches Lc 60. The two disagree most on dark pages: use the second for text people read, and report both. Dark surfaces and borders come from the neutral ramp.',
  };
  result.darkRamp = darkRamp;
  return result;
}

// Splits on a separator outside parentheses, so rgb(1, 2, 3) survives a comma-separated list.
function splitTop(s, sep) {
  const out = [''];
  let depth = 0;
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) out.push('');
    else out[out.length - 1] += ch;
  }
  return out.map((x) => x.trim()).filter(Boolean);
}

function measurePairs(list) {
  const pairs = splitTop(String(list ?? ''), ',').map((p) => splitTop(p, ':'));
  if (!pairs.length || pairs.some((p) => p.length !== 2)) throw new Error('usage: --pairs "<fg>:<bg>,<fg>:<bg>" (run --help)');
  return pairs.map(([f, b]) => {
    const [fg, bg] = [parseColor(f), parseColor(b)];
    const notes = [...fg.notes, ...bg.notes];
    return { fg: fg.hex, bg: bg.hex, ...measure(fg.hex, bg.hex), ...(notes.length ? { notes } : {}) };
  });
}

// One line per step, so the whole ramp fits on a screen and survives truncation.
function print(result) {
  const lines = Object.entries(result).map(([k, v]) => (Array.isArray(v) && typeof v[0] === 'object'
    ? ` ${JSON.stringify(k)}: [\n${v.map((r) => '  ' + JSON.stringify(r)).join(',\n')}\n ]`
    : ` ${JSON.stringify(k)}: ${JSON.stringify(v)}`));
  console.log(`{\n${lines.join(',\n')}\n}`);
}

async function selfTest() {
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  const blue = rgbToOklch(hexToRgb('#3b82f6'));
  const r = ramp('#3b82f6', { dark: true });
  const gray = ramp('#737373');
  const wide = parseColor('oklch(0.7 0.3 150)');
  const chroma = (hex) => rgbToOklch(hexToRgb(hex)).C;
  const refuses = (c) => { try { parseColor(c); return false; } catch { return true; } };
  const { spawnSync } = await import('node:child_process');
  const help = spawnSync(process.execPath, [process.argv[1], '--help'], { encoding: 'utf8' });
  const checks = {
    'wcag black on white is 21': wcag('#000000', '#ffffff') === 21,
    'wcag white on #3b82f6 is 3.68': near(wcag('#ffffff', '#3b82f6'), 3.68, 0.01),
    'apca black on white is Lc 106.0': near(apca('#000000', '#ffffff'), 106.0, 0.1),
    'apca white on black is Lc -107.9': near(apca('#ffffff', '#000000'), -107.9, 0.1),
    '#3b82f6 is about oklch(0.623 0.188 259.8)': near(blue.L, 0.623, 0.002) && near(blue.C, 0.188, 0.003) && near(blue.H, 259.8, 0.5),
    'hex round trip': ['#3b82f6', '#11ad32', '#f5f5f4', '#7c3aed'].every((h) => oklchToHex(rgbToOklch(hexToRgb(h))) === h),
    'seed lands on 500 unchanged': r.seed.step === 500 && r.ramp[5].hex === '#3b82f6',
    'every step is in sRGB': r.ramp.every((s) => s.inSrgb),
    'lightness falls step by step': r.ramp.every((s, i, a) => i === 0 || s.onWhite.wcag > a[i - 1].onWhite.wcag),
    'white on the seed step matches the direct measurement': r.ramp[5].whiteOn.wcag === wcag('#ffffff', '#3b82f6'),
    'no step is more vivid than the seed': r.ramp.every((s) => chroma(s.hex) <= blue.C + 0.004),
    'rgb(), hsl(), short hex and oklch() read as the same blue': ['rgb(59 130 246)', 'rgb(59, 130, 246)', 'rgba(23.1% 51% 96.5% / 1)', 'hsl(217.2 91.2% 59.8%)', '#3b82f6ff'].every((c) => parseColor(c).hex === '#3b82f6')
      && parseColor('#38f').hex === '#3388ff' && near(parseColor('oklch(62.3% 0.188 259.8deg)').lch.L, 0.623, 1e-9),
    'oklch() inside sRGB is kept as given': parseColor('oklch(0.62 0.19 260)').notes.length === 0 && parseColor('oklch(0.62 0.19 260)').lch.C === 0.19,
    'oklch() outside sRGB is mapped at the same L and H, and says so': wide.notes.length === 1 && inSrgb(wide.lch) && near(wide.lch.C, 0.193, 0.002) && wide.lch.L === 0.7 && wide.lch.H === 150,
    'translucent and unreadable colours are refused': ['#3b82f680', 'rgb(0 0 0 / 0.5)', 'blue', '#12345'].every(refuses),
    'yellow #facc15 lands on 200 by lightness': ramp('#facc15').seed.step === 200,
    'achromatic seed gives a neutral ramp with hue 0': gray.seed.oklch === 'oklch(0.556 0 0)' && gray.notes?.length === 1 && gray.ramp.every((s) => s.hex.slice(1, 3) === s.hex.slice(3, 5) && s.hex.slice(3, 5) === s.hex.slice(5, 7)),
    'pairs read rgb() inside a comma list': JSON.stringify(measurePairs('rgb(255, 255, 255):#3b82f6,#000:#fff').map((p) => p.wcag)) === '[3.68,21]',
    'dark steps keep 85% chroma and stay in sRGB': r.darkRamp.every((d, i) => inSrgb(rgbToOklch(hexToRgb(d.hex))) && chroma(d.hex) <= chroma(r.ramp[i].hex) * DARK_CHROMA + 0.004),
    'dark accent text picks the darkest passing step, by WCAG and by WCAG plus APCA': (() => {
      const ok = (step, pass) => {
        const i = STEPS.indexOf(step);
        return i >= 0 && pass(r.darkRamp[i]) && (i === STEPS.length - 1 || !pass(r.darkRamp[i + 1]));
      };
      return ok(r.dark.accentText.wcag, (d) => d.onPage.wcag >= 4.5)
        && ok(r.dark.accentText.wcagAndApca, (d) => d.onPage.wcag >= 4.5 && Math.abs(d.onPage.apca) >= 60)
        && r.dark.accentText.wcag === 500 && r.dark.accentText.wcagAndApca === 300;
    })(),
    '--help prints usage and exits 0': help.status === 0 && help.stdout.startsWith('Usage:'),
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) {
    console.error('self-test FAILED:\n  ' + failed.join('\n  '));
    process.exit(1);
  }
  console.log(`self-test OK (${Object.keys(checks).length} checks)`);
}

const args = process.argv.slice(2);
const has = (name) => args.includes(name);
const valueOf = (name) => (has(name) ? args[args.indexOf(name) + 1] : undefined);
try {
  if (has('--help') || has('-h')) console.log(HELP);
  else if (!args.length) {
    console.error(HELP);
    process.exit(1);
  } else if (has('--self-test')) await selfTest();
  else if (has('--pairs')) console.log(JSON.stringify(measurePairs(valueOf('--pairs')), null, 1));
  else {
    const unknown = args.find((a) => a.startsWith('-') && !['--dark', '--page'].includes(a) && a !== valueOf('--page'));
    if (unknown) throw new Error(`unknown option ${unknown} (run --help)`);
    const seed = args.find((a, i) => !a.startsWith('-') && args[i - 1] !== '--page');
    if (!seed) throw new Error('no seed colour given (run --help)');
    print(ramp(seed, { dark: has('--dark') || has('--page'), page: valueOf('--page') ?? DEFAULT_PAGE }));
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

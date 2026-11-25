import { bounds, clipFor, FPS, type Look, lookKey, stillFrame } from "./look";
import type { Clip, Layer, Rect, Step } from "./model";
import { trackIsStatic } from "./model";
import type { MoveId } from "./moves";
import { PROPS, type PropId, propLayers } from "./props";

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Short stable hash, safe in CSS identifiers. */
const hash = (s: string) =>
  [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7).toString(36);

const pathOf = (rects: Rect[], dx = 0, dy = 0) =>
  rects
    .map((r) => `M${fmt(r.x + dx)} ${fmt(r.y + dy)}h${fmt(r.w)}v${fmt(r.h)}h${fmt(-r.w)}z`)
    .join("");

const fillOf = (l: Layer) => `fill="${l.color}"${l.alpha < 1 ? ` fill-opacity="${l.alpha}"` : ""}`;

const CELL_PX = 8;

function open(box: Rect, label: string | null): string {
  const a11y = label === null ? `aria-hidden="true"` : `role="img" aria-label="${esc(label)}"`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(box.x)} ${fmt(box.y)} ${fmt(box.w)} ${fmt(box.h)}"` +
    ` width="${fmt(box.w * CELL_PX)}" height="${fmt(box.h * CELL_PX)}" shape-rendering="crispEdges" ${a11y}>` +
    (label === null ? "" : `<title>${esc(label)}</title>`)
  );
}

/** One <path> per run of same-fill layers, in painter's order. */
function flatPaths(items: Array<{ layer: Layer; dx: number; dy: number }>): string {
  const out: string[] = [];
  let fill = "";
  let d = "";
  for (const { layer, dx, dy } of items) {
    const f = fillOf(layer);
    if (f !== fill && d) {
      out.push(`<path ${fill} d="${d}"/>`);
      d = "";
    }
    fill = f;
    d += pathOf(layer.rects, dx, dy);
  }
  if (d) out.push(`<path ${fill} d="${d}"/>`);
  return out.join("");
}

function frameItems(clip: Clip, frame: number, skipShadow = false) {
  const i = ((Math.trunc(frame) % clip.frames) + clip.frames) % clip.frames;
  return clip.parts.flatMap((p) => {
    const step = p.track[i];
    if (!step?.[2] || (skipShadow && p.kind === "shadow")) return [];
    return p.layers.map((layer) => ({ layer, dx: step[0], dy: step[1] }));
  });
}

function boxOf(items: Array<{ layer: Layer; dx: number; dy: number }>): Rect {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const { layer, dx, dy } of items) {
    for (const r of layer.rects) {
      x0 = Math.min(x0, r.x + dx);
      y0 = Math.min(y0, r.y + dy);
      x1 = Math.max(x1, r.x + dx + r.w);
      y1 = Math.max(y1, r.y + dy + r.h);
    }
  }
  return { x: x0 - 1, y: y0 - 1, w: x1 - x0 + 2, h: y1 - y0 + 2 };
}

/** Keyframes that fire only where the step changes. `step-end` holds each until the next. */
function keyframes(name: string, track: Step[]): string {
  const n = track.length;
  const rows: string[] = [];
  let prev = "";
  track.forEach(([dx, dy, on], i) => {
    const key = `${dx},${dy},${on}`;
    if (key === prev) return;
    prev = key;
    rows.push(`${fmt((i / n) * 100)}%{transform:translate(${dx}px,${dy}px);opacity:${on}}`);
  });
  return `@keyframes ${name}{${rows.join("")}}`;
}

function defaultTitle(look: Look): string {
  const names = look.props.map((id) => PROPS.find((p) => p.id === id)?.name.toLowerCase());
  return `Claude sticker, ${look.move}${names.length ? ` with ${names.join(", ")}` : ""}`;
}

/**
 * Sticker as a standalone SVG cropped to the look's bounds. Static draws one frame. Animated is
 * pure CSS (step-end keyframes), works in <img>, inline and READMEs; names are hashed from the
 * whole look so many inline SVGs on one page never collide. Reduced motion shows `frame ?? still`.
 */
export function stickerSvg(
  look: Look,
  opts: { animated: boolean; frame?: number; title?: string },
): string {
  const clip = clipFor(look);
  const box = bounds(look);
  const title = opts.title ?? defaultTitle(look);
  const at = opts.frame ?? stillFrame(look.move);
  if (!opts.animated) return `${open(box, title)}${flatPaths(frameItems(clip, at))}</svg>`;

  const i = ((Math.trunc(at) % clip.frames) + clip.frames) % clip.frames;
  const P = `st${hash(lookKey(look))}`;
  const css: string[] = [];
  const classes = new Map<string, string>(); // track signature -> class
  const groups: string[] = [];
  for (const p of clip.parts) {
    if (!p.track.some((s) => s[2] === 1)) continue;
    const s = p.track[i] ?? p.track[0]!;
    const initial = `${s[0] || s[1] ? ` transform="translate(${s[0]} ${s[1]})"` : ""}${s[2] ? "" : ` opacity="0"`}`;
    const paths = p.layers.map((l) => `<path ${fillOf(l)} d="${pathOf(l.rects)}"/>`).join("");
    if (trackIsStatic(p.track)) {
      groups.push(`<g${initial}>${paths}</g>`);
      continue;
    }
    const sig = JSON.stringify(p.track);
    let k = classes.get(sig);
    if (!k) {
      k = `${P}k${classes.size}`;
      classes.set(sig, k);
      css.push(keyframes(k, p.track), `.${k}{animation-name:${k}}`);
    }
    groups.push(`<g class="${P}a ${k}"${initial}>${paths}</g>`);
  }
  const dur = clip.frames / FPS;
  return (
    `${open(box, title)}<style>.${P}a{animation-duration:${fmt(dur)}s;animation-timing-function:step-end;animation-iteration-count:infinite}${css.join("")}` +
    `@media (prefers-reduced-motion:reduce){.${P}a{animation:none}}</style>${groups.join("")}</svg>`
  );
}

/** Thumbnails carry a one-cell white ring, like the die-cut, so dark ink survives on dark tiles. */
function thumb(items: Array<{ layer: Layer; dx: number; dy: number }>): string {
  const ring: Layer = {
    color: "#FFFFFF",
    alpha: 1,
    rects: items.flatMap(({ layer, dx, dy }) =>
      layer.rects.map((r) => ({ x: r.x + dx - 1, y: r.y + dy - 1, w: r.w + 2, h: r.h + 2 })),
    ),
  };
  const all = [{ layer: ring, dx: 0, dy: 0 }, ...items];
  return `${open(boxOf(all), null)}${flatPaths(all)}</svg>`;
}

/** The mascot at the move's still frame, no props, outline off, cropped to what is drawn. */
export function moveThumbSvg(move: MoveId): string {
  const look: Look = { move, props: [], outline: false };
  return thumb(frameItems(clipFor(look), stillFrame(move), true));
}

/** The prop art alone, cropped. */
export function propThumbSvg(prop: PropId): string {
  return thumb(propLayers(prop).map((layer) => ({ layer, dx: 0, dy: 0 })));
}

/** The look's silhouette cue for the outline control: the mascot with or without the die-cut. */
export function outlineThumbSvg(outline: boolean): string {
  const look: Look = { move: "wave", props: [], outline };
  const items = frameItems(clipFor(look), stillFrame("wave"), true);
  return `${open(boxOf(items), null)}${flatPaths(items)}</svg>`;
}

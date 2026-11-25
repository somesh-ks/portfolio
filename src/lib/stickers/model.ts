// One animation model drives every output: SVG, Lottie, PNG and GIF. A clip is a set of
// rigid pixel parts. Each part has a rect list and a per-frame track of [dx, dy, visible].
// Motion is translation and visibility only, so it stays pixel-exact in every format and
// maps 1:1 to CSS keyframes and Lottie hold keyframes.
//
// Coordinates are cells. Mascot-local (0,0) is the top-left of the body; negative values
// (hats, flags) are fine because every output crops to the union bounds.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Layer {
  color: string;
  alpha: number;
  rects: Rect[];
}
/** [dx, dy, visible] */
export type Step = readonly [number, number, 0 | 1];

export type PartKind = "shadow" | "body" | "eyes" | "prop" | "own" | "outline";

export interface Part {
  id: string;
  kind: PartKind;
  z: number;
  layers: Layer[];
  track: Step[];
}

export interface Clip {
  frames: number;
  parts: Part[];
}

export interface FrameRect extends Rect {
  color: string;
  alpha: number;
}

const cache = new WeakMap<Clip, FrameRect[][]>();

const wrap = (f: number, n: number) => ((Math.trunc(f) % n) + n) % n;

/** Flat, z-ordered rect list for one frame. Cached per clip. */
export function frameRects(clip: Clip, f: number): FrameRect[] {
  let frames = cache.get(clip);
  if (!frames) {
    frames = Array.from<FrameRect[] | undefined>({ length: clip.frames }) as FrameRect[][];
    cache.set(clip, frames);
  }
  const i = wrap(f, clip.frames);
  const hit = frames[i];
  if (hit) return hit;
  const out: FrameRect[] = [];
  for (const p of clip.parts) {
    const step = p.track[i];
    if (!step || !step[2]) continue;
    const [dx, dy] = step;
    for (const l of p.layers) {
      for (const r of l.rects) {
        out.push({ x: r.x + dx, y: r.y + dy, w: r.w, h: r.h, color: l.color, alpha: l.alpha });
      }
    }
  }
  frames[i] = out;
  return out;
}

/**
 * ASCII art to layers. Characters map to colors through `pal`; '.' and ' ' are empty.
 * Horizontal runs are merged vertically so shapes become few, seam-free rects.
 */
export function art(
  rows: string[],
  x0: number,
  y0: number,
  pal: Record<string, string>,
  alpha = 1,
): Layer[] {
  const byColor = new Map<string, Rect[]>();
  let open = new Map<string, Rect[]>(); // runs ending on the previous row, per color
  const push = (m: Map<string, Rect[]>, k: string, r: Rect) => {
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  };
  rows.forEach((row, y) => {
    const next = new Map<string, Rect[]>();
    let x = 0;
    while (x < row.length) {
      const ch = row.charAt(x);
      const color = pal[ch];
      if (ch === "." || ch === " " || !color) {
        x++;
        continue;
      }
      let e = x;
      while (e < row.length && row[e] === ch) e++;
      const prev = open
        .get(color)
        ?.find((r) => r.x === x0 + x && r.w === e - x && r.y + r.h === y0 + y);
      if (prev) {
        prev.h++;
        push(next, color, prev);
      } else {
        const r = { x: x0 + x, y: y0 + y, w: e - x, h: 1 };
        push(byColor, color, r);
        push(next, color, r);
      }
      x = e;
    }
    open = next;
  });
  return [...byColor].map(([color, rects]) => ({ color, alpha, rects }));
}

export const rectLayer = (
  color: string,
  rects: Array<[number, number, number, number]>,
  alpha = 1,
): Layer => ({
  color,
  alpha,
  rects: rects.map(([x, y, w, h]) => ({ x, y, w, h })),
});

export const HIDDEN: Step = [0, 0, 0];

export const trackIsStatic = (t: Step[]): boolean => {
  const first = t[0];
  return !first || t.every((s) => s[0] === first[0] && s[1] === first[1] && s[2] === first[2]);
};

export const rectCount = (layers: Layer[]): number =>
  layers.reduce((n, l) => n + l.rects.length, 0);

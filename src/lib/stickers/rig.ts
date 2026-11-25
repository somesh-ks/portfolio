import {
  type Clip,
  HIDDEN,
  type Layer,
  type Part,
  type PartKind,
  type Rect,
  rectLayer,
  type Step,
} from "./model";
import { COLORS as K, type PropId, propLayers, propZ, slotOf } from "./props";

// Mascot-local geometry. 24 wide, 16 tall. Head 4..19, arms 0..3 / 20..23 on rows 4..7.
const TORSO: Layer[] = [rectLayer(K.body, [[4, 0, 16, 11]]), rectLayer(K.shade, [[4, 11, 16, 1]])];
const ARM_L: Layer[] = [rectLayer(K.body, [[0, 4, 4, 3]]), rectLayer(K.shade, [[0, 7, 4, 1]])];
const ARM_R: Layer[] = [rectLayer(K.body, [[20, 4, 4, 3]]), rectLayer(K.shade, [[20, 7, 4, 1]])];
const LEG_X = [4, 8, 14, 18];
const legLayers = (x: number): Layer[] => [
  rectLayer(K.body, [[x, 12, 2, 3]]),
  rectLayer(K.shade, [[x, 15, 2, 1]]),
];
const EYES = {
  open: [
    rectLayer(K.ink, [
      [6, 2, 2, 2],
      [16, 2, 2, 2],
    ]),
  ],
  closed: [
    rectLayer(K.ink, [
      [6, 3, 2, 1],
      [16, 3, 2, 1],
    ]),
  ],
  happy: [
    rectLayer(K.ink, [
      [6, 3, 1, 1],
      [7, 2, 1, 1],
      [8, 3, 1, 1],
      [15, 3, 1, 1],
      [16, 2, 1, 1],
      [17, 3, 1, 1],
    ]),
  ],
};
const SHADOW: Layer[][] = [
  [
    rectLayer(
      K.ink,
      [
        [3, 16, 18, 1],
        [5, 17, 14, 1],
      ],
      0.16,
    ),
  ],
  [
    rectLayer(
      K.ink,
      [
        [5, 16, 14, 1],
        [7, 17, 10, 1],
      ],
      0.12,
    ),
  ],
  [
    rectLayer(
      K.ink,
      [
        [7, 16, 10, 1],
        [9, 17, 6, 1],
      ],
      0.09,
    ),
  ],
];

const body = (p: Pose): [number, number] => p.body ?? [0, 0];

export interface Pose {
  body?: [number, number];
  armL?: [number, number];
  armR?: [number, number];
  /** Absolute leg offsets (dy), so airborne poses can tuck. */
  legs?: [number, number, number, number];
  eyes?: "open" | "closed" | "happy";
  eye?: [number, number];
  shadow?: 0 | 1 | 2;
  /** The move's own prop visibility and offset by id. Absent = hidden. */
  fx?: Record<string, [number, number]>;
}

export interface OwnProp {
  id: string;
  z: "front" | "mid" | "back";
  layers: Layer[];
}

/** Z-order bands. The die-cut sits below everything, ground shadow below it. */
const Z = {
  shadow: -10,
  ring: -5,
  back: 5,
  legs: 10,
  torso: 20,
  mid: 25,
  arms: 30,
  eyes: 40,
  front: 60,
};

export interface ClipSpec {
  frames: number;
  props?: OwnProp[];
  pose: (f: number) => Pose;
}

type Grid = Uint8Array;

/** Square dilation by r cells. */
function dilate(g: Grid, w: number, h: number, r: number): Grid {
  let cur = g;
  for (let k = 0; k < r; k++) {
    const next = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let on = 0;
        for (let dy = -1; dy <= 1 && !on; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h && cur[ny * w + nx]) {
              on = 1;
              break;
            }
          }
        }
        next[y * w + x] = on;
      }
    }
    cur = next;
  }
  return cur;
}

const invert = (g: Grid): Grid => g.map((v) => (v ? 0 : 1));

/** Fills every empty cell the outside can't reach (4-neighbour flood from the border). */
function fillHoles(g: Grid, w: number, h: number): Grid {
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  const seed = (x: number, y: number) => {
    const i = y * w + x;
    if (!g[i] && !seen[i]) {
      seen[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x, 0);
    seed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    seed(0, y);
    seed(w - 1, y);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) seed(x - 1, y);
    if (x < w - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < h - 1) seed(x, y + 1);
  }
  return g.map((v, i) => (v || !seen[i] ? 1 : 0));
}

/** Runs merged vertically into few rects, in cells (`unit` grid cells per cell). */
function gridRects(g: Grid, w: number, h: number, ox: number, oy: number, unit = 1) {
  const out: Rect[] = [];
  let open: Rect[] = [];
  for (let y = 0; y < h; y++) {
    const next: Rect[] = [];
    let x = 0;
    while (x < w) {
      if (!g[y * w + x]) {
        x++;
        continue;
      }
      let e = x;
      while (e < w && g[y * w + e]) e++;
      const prev = open.find((r) => r.x === x && r.w === e - x && r.y + r.h === y);
      if (prev) {
        prev.h++;
        next.push(prev);
      } else {
        const r = { x, y, w: e - x, h: 1 };
        out.push(r);
        next.push(r);
      }
      x = e;
    }
    open = next;
  }
  return out.map((r) => ({
    x: ox + r.x / unit,
    y: oy + r.y / unit,
    w: r.w / unit,
    h: r.h / unit,
  }));
}

const BORDER = 2; // cells of white around the art
const HAIR = 4; // hairline thickness is 1/HAIR cell

/**
 * One closed die-cut silhouette per frame: the union of every visible cell, closed (dilate 3,
 * erode 1) so gaps of up to four cells bridge, with enclosed holes filled. That mask is the
 * white border, and a quarter-cell hairline is drawn just outside it. Frames with the same mask
 * share one pair of parts that are visible only on those frames, so tracks, CSS keyframes,
 * Lottie and raster all keep working.
 */
function outlineParts(parts: Part[], N: number): Part[] {
  const per: Rect[][] = Array.from({ length: N }, () => []);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of parts) {
    for (let f = 0; f < N; f++) {
      const s = p.track[f];
      if (!s?.[2]) continue;
      for (const l of p.layers) {
        for (const r of l.rects) {
          const q = { x: r.x + s[0], y: r.y + s[1], w: r.w, h: r.h };
          per[f]!.push(q);
          x0 = Math.min(x0, q.x);
          y0 = Math.min(y0, q.y);
          x1 = Math.max(x1, q.x + q.w);
          y1 = Math.max(y1, q.y + q.h);
        }
      }
    }
  }
  const m = BORDER + 3;
  const ox = Math.floor(x0) - m;
  const oy = Math.floor(y0) - m;
  const w = Math.ceil(x1) - ox + m;
  const h = Math.ceil(y1) - oy + m;

  const groups = new Map<string, { frames: number[]; mask: Grid }>();
  for (let f = 0; f < N; f++) {
    const u = new Uint8Array(w * h);
    for (const r of per[f]!) {
      for (let y = Math.floor(r.y) - oy; y < Math.ceil(r.y + r.h) - oy; y++) {
        for (let x = Math.floor(r.x) - ox; x < Math.ceil(r.x + r.w) - ox; x++) u[y * w + x] = 1;
      }
    }
    const closed = invert(dilate(invert(dilate(u, w, h, 3)), w, h, 1));
    const mask = fillHoles(closed, w, h);
    const key = mask.join("");
    const g = groups.get(key) ?? { frames: [], mask };
    g.frames.push(f);
    groups.set(key, g);
  }

  const out: Part[] = [];
  let n = 0;
  for (const { frames, mask } of groups.values()) {
    const track: Step[] = Array.from({ length: N }, (_, f) =>
      frames.includes(f) ? [0, 0, 1] : HIDDEN,
    );
    // Hairline: the mask on a finer grid, grown by one fine cell, minus the mask.
    const fw = w * HAIR;
    const fh = h * HAIR;
    const fine = new Uint8Array(fw * fh);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++)
        fine[y * fw + x] = mask[Math.floor(y / HAIR) * w + Math.floor(x / HAIR)]!;
    }
    const grown = dilate(fine, fw, fh, 1);
    const edge = grown.map((v, i) => (v && !fine[i] ? 1 : 0));
    out.push(
      {
        id: `edge${n}`,
        kind: "outline",
        z: Z.ring - 1,
        layers: [{ color: K.ring, alpha: 1, rects: gridRects(edge, fw, fh, ox, oy, HAIR) }],
        track,
      },
      {
        id: `ring${n}`,
        kind: "outline",
        z: Z.ring,
        layers: [{ color: K.white, alpha: 1, rects: gridRects(mask, w, h, ox, oy) }],
        track,
      },
    );
    n++;
  }
  return out;
}

/** Builds a clip from poses: the mascot, its props (head and face ride the body, hand rides the left arm). */
export function buildClip(spec: ClipSpec, props: readonly PropId[], outline: boolean): Clip {
  const N = spec.frames;
  const poses = Array.from({ length: N }, (_, f) => spec.pose(f));
  const track = (fn: (p: Pose) => Step): Step[] => poses.map(fn);
  const shades = props.includes("shades");

  const parts: Part[] = [];
  const add = (id: string, kind: PartKind, z: number, layers: Layer[], t: Step[]) =>
    parts.push({ id, kind, z, layers, track: t });

  if (!outline) {
    SHADOW.forEach((l, i) =>
      add(
        `shadow${i}`,
        "shadow",
        Z.shadow,
        l,
        track((p) => ((p.shadow ?? 0) === i ? [body(p)[0], 0, 1] : HIDDEN)),
      ),
    );
  }
  LEG_X.forEach((x, i) =>
    add(
      `leg${i}`,
      "body",
      Z.legs,
      legLayers(x),
      track((p) => [body(p)[0], p.legs?.[i] ?? 0, 1]),
    ),
  );
  add(
    "torso",
    "body",
    Z.torso,
    TORSO,
    track((p) => [body(p)[0], body(p)[1], 1]),
  );
  add(
    "armL",
    "body",
    Z.arms,
    ARM_L,
    track((p) => [body(p)[0] + (p.armL?.[0] ?? 0), body(p)[1] + (p.armL?.[1] ?? 0), 1]),
  );
  add(
    "armR",
    "body",
    Z.arms,
    ARM_R,
    track((p) => [body(p)[0] + (p.armR?.[0] ?? 0), body(p)[1] + (p.armR?.[1] ?? 0), 1]),
  );
  // Under shades the eyes turn pale blue on dark lenses and hold still, so the glance offset is ignored.
  (["open", "closed", "happy"] as const).forEach((k) =>
    add(
      `eyes_${k}`,
      "eyes",
      Z.eyes,
      shades ? EYES[k].map((l) => ({ ...l, color: K.skyLight })) : EYES[k],
      track((p) =>
        (p.eyes ?? "open") === k
          ? [
              body(p)[0] + (shades ? 0 : (p.eye?.[0] ?? 0)),
              body(p)[1] + (shades ? 0 : (p.eye?.[1] ?? 0)),
              1,
            ]
          : HIDDEN,
      ),
    ),
  );
  for (const id of props) {
    const hand = slotOf(id) === "hand";
    add(
      `prop:${id}`,
      "prop",
      propZ(id),
      propLayers(id),
      track((p) =>
        hand
          ? [body(p)[0] + (p.armL?.[0] ?? 0), body(p)[1] + (p.armL?.[1] ?? 0), 1]
          : [body(p)[0], body(p)[1], 1],
      ),
    );
  }
  for (const prop of spec.props ?? []) {
    add(
      prop.id,
      "own",
      Z[prop.z],
      prop.layers,
      track((p) => {
        const o = p.fx?.[prop.id];
        return o ? [o[0], o[1], 1] : HIDDEN;
      }),
    );
  }

  if (outline) parts.push(...outlineParts(parts, N));

  parts.sort((a, b) => a.z - b.z);
  return { frames: N, parts };
}

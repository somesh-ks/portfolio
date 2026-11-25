import type { ActionDef, ArmShape, Pose } from "./actions";
import type { ItemDef } from "./items";
import { partsOf } from "./items";
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
import { COLORS as K } from "./palette";

export type Outline = 0 | 1 | 2;

// Mascot-local geometry. 24 wide, 16 tall. Head 4..19, arms 0..3 / 20..23 on rows 4..7.
const TORSO: Layer[] = [rectLayer(K.body, [[4, 0, 16, 11]]), rectLayer(K.shade, [[4, 11, 16, 1]])];
// The left hand: a fist over the grip of a held item. Items are the object only; the hand is ours.
const FIST: Layer[] = [
  rectLayer(K.body, [[0, 4, 2, 3]]),
  rectLayer(K.light, [[0, 4, 2, 1]]),
  rectLayer(K.shade, [[0, 6, 2, 1]]),
];
const armLayers = (x: number): Layer[] => [
  rectLayer(K.body, [[x, 4, 4, 3]]),
  rectLayer(K.shade, [[x, 7, 4, 1]]),
];
// The arm roots sit under the torso on the arm's own track. They overlap the arm by two cells and
// the torso by three, so an outward step of up to 3 cells still leaves the limb joined: no
// antialiased crack where two abutting rects meet, and no white die-cut showing through it.
const ARM_L: Layer[] = armLayers(0);
const ARM_R: Layer[] = armLayers(20);
const ROOT_L: Layer[] = [rectLayer(K.body, [[2, 4, 6, 3]]), rectLayer(K.shade, [[2, 7, 6, 1]])];
const ROOT_R: Layer[] = [rectLayer(K.body, [[16, 4, 6, 3]]), rectLayer(K.shade, [[16, 7, 6, 1]])];
// Raised arms. `bent` is the flat arm plus a hand stub standing on its outer end (elbow out, hand
// up); `up` is a vertical stub 2 wide, 6 tall standing on the shoulder, with its own root so the
// torso never loses the join. Each shape is its own part; a pose picks one per frame.
const raisedL = (x: number) => [rectLayer(K.body, [[x, -3, 2, 7]])];
const UP_L: Layer[] = raisedL(2);
const UP_R: Layer[] = raisedL(20);
const UP_ROOT_L: Layer[] = [rectLayer(K.body, [[2, 2, 6, 3]]), rectLayer(K.shade, [[2, 5, 6, 1]])];
const UP_ROOT_R: Layer[] = [
  rectLayer(K.body, [[16, 2, 6, 3]]),
  rectLayer(K.shade, [[16, 5, 6, 1]]),
];
const bentLayers = (x: number, hand: number): Layer[] => [
  rectLayer(K.body, [
    [x, 4, 4, 3],
    [hand, 0, 2, 4],
  ]),
  rectLayer(K.shade, [[x, 7, 4, 1]]),
];
const BENT_L: Layer[] = bentLayers(0, 0);
const BENT_R: Layer[] = bentLayers(20, 22);
/** Where the left hand is in each shape, from the flat fist's place: items and the fist follow. */
const HAND_AT: Record<ArmShape, readonly [number, number]> = {
  flat: [0, 0],
  bent: [0, -4],
  up: [2, -7],
};
const LEG_X = [4, 8, 14, 18];
// Legs start one row up, under the torso, for the same reason.
const legLayers = (x: number): Layer[] => [
  rectLayer(K.body, [[x, 11, 2, 4]]),
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
        [5, 16, 14, 1],
        [7, 17, 10, 1],
      ],
      0.09,
    ),
  ],
  [
    rectLayer(
      K.ink,
      [
        [7, 16, 10, 1],
        [9, 17, 6, 1],
      ],
      0.07,
    ),
  ],
  [
    rectLayer(
      K.ink,
      [
        [9, 16, 6, 1],
        [10, 17, 4, 1],
      ],
      0.05,
    ),
  ],
];

/** Z-order bands. The die-cut sits below everything, ground shadow below it. */
const Z = {
  shadow: -10,
  ring: -5,
  rideBack: 8,
  legs: 10,
  ground: 12,
  roots: 15,
  torso: 20,
  /** A ride's own hands: over the torso, under the vehicle's front. */
  rideArms: 21,
  rideFront: 22,
  front: 25,
  arms: 30,
  face: 35,
  eyes: 40,
  head: 50,
  hand: 60,
  lane: 70,
};

const Z_OF: Record<ItemDef["anchor"], number> = {
  head: Z.head,
  face: Z.face,
  handL: Z.hand,
  front: Z.front,
  ground: Z.ground,
  lane: Z.lane,
  ride: Z.rideFront,
};

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

const HAIR = 4; // hairline thickness is 1/HAIR cell
const BORDER = 2; // cells of white around the art (thick)

/**
 * One closed die-cut silhouette per frame: the union of every visible cell, closed (dilate 3,
 * erode 1) so gaps of up to four cells bridge, with enclosed holes filled. That mask is the
 * thick (2 cell) white border, one cell less for thin, and a quarter-cell hairline is drawn just outside it. Frames with the same mask
 * share one pair of parts that are visible only on those frames, so tracks, CSS keyframes,
 * Lottie and raster all keep working.
 */
function outlineParts(parts: Part[], N: number, width: 1 | 2): Part[] {
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
    const filled = fillHoles(closed, w, h);
    // Thin trims the closed silhouette by one cell; the closing above is the same for both.
    const mask = width === 1 ? invert(dilate(invert(filled), w, h, 1)) : filled;
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

const step = (p: readonly [number, number] | null): Step => (p ? [p[0], p[1], 1] : HIDDEN);
const clampTuck = (n: number) => Math.max(-1, Math.min(0, n));

/**
 * Builds a clip: the mascot, then each item on its anchor. Arms and legs are placed from the
 * action unless an item claims them (front items claim the arms, rides the legs).
 */
export function buildClip(action: ActionDef, items: readonly ItemDef[], outline: Outline): Clip {
  const N = action.frames;
  const poses: Pose[] = Array.from({ length: N }, (_, f) => action.pose(f));
  const armsItem = items.find((i) => i.claims === "arms");
  const ride = items.find((i) => i.claims === "legs");
  const rider = ride?.rider;
  const tint = items.find((i) => i.eyeTint)?.eyeTint;
  const holdsItem = items.some((i) => i.anchor === "handL");

  // A ride's stem and bar sit at the eyes' height, so a rider never sinks more than one row.
  const body = (f: number): readonly [number, number] => {
    const b = poses[f]?.body ?? [0, 0];
    return ride && b[1] > 1 ? [b[0], 1] : b;
  };
  /** The ride's anchor: the body, never below the ground. */
  const seat = (f: number): readonly [number, number] => [body(f)[0], Math.min(0, body(f)[1])];
  const posed = (f: number) => (rider ? rider(f, N) : null);
  /** Where the torso is: the body, plus the ride's own nudge. Heads, faces and eyes follow it. */
  const torso = (f: number): readonly [number, number] => {
    const n = posed(f)?.body ?? [0, 0];
    return [body(f)[0] + n[0], body(f)[1] + n[1]];
  };
  /**
   * A limb the ride poses: from the seat, null when hidden, undefined when the action or a front
   * item places it. A hand item brings the left arm out so there is a hand to hold it.
   */
  const riderArm = (
    f: number,
    side: "armL" | "armR",
  ): readonly [number, number] | null | undefined => {
    const p = posed(f);
    if (!p || armsItem) return undefined;
    const [sx, sy] = seat(f);
    if (side === "armL" && holdsItem)
      return [sx + (ride?.handL?.[0] ?? 0), sy + (ride?.handL?.[1] ?? 0)];
    const l = p[side];
    return l ? [sx + l[0], sy + l[1]] : null;
  };
  /** The arm's drawn shape. Rides and front items place the arms themselves: always flat. */
  const shape = (f: number, side: "armL" | "armR"): ArmShape =>
    rider || armsItem ? "flat" : (poses[f]?.[side === "armL" ? "shapeL" : "shapeR"] ?? "flat");
  const arm = (f: number, side: "armL" | "armR"): readonly [number, number] | null => {
    const r = riderArm(f, side);
    if (r !== undefined) return r;
    const held = armsItem?.hold?.(f);
    const rel = held ? held[side] : (poses[f]?.[side] ?? [0, 0]);
    return [torso(f)[0] + rel[0], torso(f)[1] + rel[1]];
  };
  /** The left hand's grip point: the arm's place, moved to where the shape holds the hand. */
  const handPoint = (f: number): readonly [number, number] => {
    const a = arm(f, "armL");
    if (!a) return torso(f);
    const h = HAND_AT[shape(f, "armL")];
    return [a[0] + h[0], a[1] + h[1]];
  };
  const legAt = (f: number, i: number): readonly [number, number] | null => {
    const p = posed(f);
    if (p) {
      const l = p.legs[i];
      return l ? [seat(f)[0] + l[0], seat(f)[1] + l[1]] : null;
    }
    if (ride?.seat === "hide") return null;
    // Feet stay planted when the body dips and rise with it, so a leg never detaches.
    const sx = ride ? 0 : Math.max(-1, Math.min(1, poses[f]?.legsX?.[i] ?? 0));
    return [
      body(f)[0] + sx,
      Math.min(0, body(f)[1]) + (ride ? 0 : clampTuck(poses[f]?.legs?.[i] ?? 0)),
    ];
  };
  const track = (fn: (f: number) => Step): Step[] => Array.from({ length: N }, (_, f) => fn(f));

  const parts: Part[] = [];
  const add = (id: string, kind: PartKind, z: number, layers: Layer[], t: Step[]) =>
    parts.push({ id, kind, z, layers, track: t });

  if (!outline) {
    const gy = (ride?.ground ?? 16) - 16;
    SHADOW.forEach((l, i) =>
      add(
        `shadow${i}`,
        "shadow",
        Z.shadow,
        l,
        track((f) => ((poses[f]?.shadow ?? 0) === i ? [body(f)[0], gy, 1] : HIDDEN)),
      ),
    );
  }
  LEG_X.forEach((x, i) =>
    add(
      `leg${i}`,
      "body",
      Z.legs,
      legLayers(x),
      track((f) => step(legAt(f, i))),
    ),
  );
  add(
    "torso",
    "body",
    Z.torso,
    TORSO,
    track((f) => step(torso(f))),
  );
  for (const [side, layers, root, bent, up, upRoot] of [
    ["armL", ARM_L, ROOT_L, BENT_L, UP_L, UP_ROOT_L],
    ["armR", ARM_R, ROOT_R, BENT_R, UP_R, UP_ROOT_R],
  ] as const) {
    const only = (...shapes: ArmShape[]) =>
      track((f) => {
        const a = arm(f, side);
        return a && shapes.includes(shape(f, side)) ? [a[0], a[1], 1] : HIDDEN;
      });
    // A ride's own hands sit under its front layer, so the bar is held, not covered.
    const own = rider && !armsItem && !ride?.handsOver && !(side === "armL" && holdsItem);
    add(`${side}_root`, "body", Z.roots, root, only("flat", "bent"));
    add(`${side}_up_root`, "body", Z.roots, upRoot, only("up"));
    add(side, "body", own ? Z.rideArms : Z.arms, layers, only("flat"));
    add(`${side}_bent`, "body", Z.arms, bent, only("bent"));
    add(`${side}_up`, "body", Z.arms, up, only("up"));
  }
  // Under tinted lenses the eyes hold still, so the glance offset is ignored.
  (["open", "closed", "happy"] as const).forEach((k) =>
    add(
      `eyes_${k}`,
      "eyes",
      Z.eyes,
      tint ? EYES[k].map((l) => ({ ...l, color: tint })) : EYES[k],
      track((f) =>
        (poses[f]?.eyes ?? "open") === k
          ? [
              torso(f)[0] + (tint ? 0 : (ride?.eye?.[0] ?? 0) + (poses[f]?.eye?.[0] ?? 0)),
              torso(f)[1] + (tint ? 0 : (ride?.eye?.[1] ?? 0) + (poses[f]?.eye?.[1] ?? 0)),
              1,
            ]
          : HIDDEN,
      ),
    ),
  );

  for (const item of items) {
    const base = (f: number): readonly [number, number] => {
      switch (item.anchor) {
        case "handL":
          return handPoint(f);
        case "ride":
          return seat(f);
        case "ground":
          // Stays on the ground, but half-follows a jump so the die-cut stays one piece.
          return [0, Math.ceil(Math.min(0, body(f)[1]) / 2)];
        default:
          // head, face, front and lane: the lane rides with the head so it never drifts off.
          return torso(f);
      }
    };
    partsOf(item).forEach((p, k) => {
      const z =
        item.z ??
        (item.anchor === "ride" ? (p.z === "back" ? Z.rideBack : Z.rideFront) : Z_OF[item.anchor]);
      add(
        `item:${item.id}:${k}`,
        "item",
        z,
        p.layers,
        track((f) => {
          const whole = item.pose ? item.pose(f, N) : [0, 0];
          const own = p.at ? p.at(f, N) : [0, 0];
          if (!whole || !own) return HIDDEN;
          const b = base(f);
          return [b[0] + whole[0] + own[0], b[1] + whole[1] + own[1], 1];
        }),
      );
    });
  }

  if (holdsItem)
    add(
      "armL_hand",
      "body",
      Z.hand + 1,
      FIST,
      track((f) => step(arm(f, "armL") && handPoint(f))),
    );

  if (outline) parts.push(...outlineParts(parts, N, outline));

  // Stable sort: parts with equal z keep their insertion order.
  parts.sort((a, b) => a.z - b.z);
  return { frames: N, parts };
}

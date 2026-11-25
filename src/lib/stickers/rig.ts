import {
  type Clip,
  HIDDEN,
  type Layer,
  type Part,
  type PartKind,
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

/** Z-order bands. Outline rings sit below everything, ground shadow below the rings. */
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

/** Soft ink ring, 2 cells out, then white, 1 cell out. Solid colours so every format agrees. */
const RINGS: Array<{ grow: number; color: string; z: number }> = [
  { grow: 2, color: K.ring, z: Z.ring - 1 },
  { grow: 1, color: K.white, z: Z.ring },
];

const grow = (layers: Layer[], g: number) =>
  layers.flatMap((l) =>
    l.rects.map((r) => ({ x: r.x - g, y: r.y - g, w: r.w + 2 * g, h: r.h + 2 * g })),
  );

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

  if (outline) {
    // One underlay per distinct track and ring, so parts that move together share it.
    const groups = new Map<string, { track: Step[]; layers: Layer[] }>();
    for (const p of parts) {
      if (!p.track.some((s) => s[2] === 1)) continue;
      const key = JSON.stringify(p.track);
      const g = groups.get(key) ?? { track: p.track, layers: [] };
      g.layers.push(...p.layers);
      groups.set(key, g);
    }
    let n = 0;
    for (const g of groups.values()) {
      for (const ring of RINGS) {
        add(
          `ring${n++}`,
          "outline",
          ring.z,
          [{ color: ring.color, alpha: 1, rects: grow(g.layers, ring.grow) }],
          g.track,
        );
      }
    }
  }

  parts.sort((a, b) => a.z - b.z);
  return { frames: N, parts };
}

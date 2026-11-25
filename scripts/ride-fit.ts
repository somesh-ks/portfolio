/**
 * Fits the sticker rig's mascot (torso, two arms, four legs) to the claude.dev ride sprites in
 * public/runner/rides.json, so a ridden sticker reproduces the original pose cell for cell.
 * Used by scripts/extract-rides.ts (writes items/ride-data.ts) and by tests/unit/stickers.test.ts
 * (checks the rendered body against the decoded original).
 *
 * Per sprite loop frame the sprite's cells are sorted into T (mascot colours), F (anything else:
 * the vehicle, plus the bike's helmet, which our rig draws as a hat) and E (empty). The rig's
 * parts are rigid rects; each limb gets a small integer offset, or null (hidden behind the
 * torso). A fit is scored by T cells it leaves bare plus cells it paints on E (F cells are free:
 * the vehicle is drawn over them). Whatever T cells stay bare become ride-owned fill in body
 * colours, so the result matches the original exactly; `fill` reports how many cells that took.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export interface RawRide {
  w: number;
  h: number;
  palette: string[];
  base: string;
  deltas: string[];
}

/** The decoder from src/lib/runner/claude-sprites.ts (base plus per-frame deltas, 255 = empty). */
export function decode(raw: RawRide): Uint8Array[] {
  const current = Uint8Array.from(raw.base, (ch) => (ch === "." ? 255 : Number(ch)));
  const frames = [current.slice()];
  for (const delta of raw.deltas) {
    for (const token of delta ? delta.split(",") : []) {
      if (!token) continue;
      const value = token.at(-1);
      current[parseInt(token.slice(0, -1), 36)] = value === "." ? 255 : Number(value);
    }
    frames.push(current.slice());
  }
  return frames;
}

export const loadRides = (): Record<string, RawRide> =>
  JSON.parse(readFileSync(path.join(import.meta.dir, "../public/runner/rides.json"), "utf8"));

export interface RideSpec {
  loop: readonly [number, number];
  /** Palette indices that are the mascot. Index 0 is its eyes. */
  mascot: readonly number[];
  vehicle: readonly number[];
  /** Vehicle pixels this returns true for are dropped (the bike's helmet: our hats do that). */
  skip?: (x: number, y: number, v: number) => boolean;
  /** Candidate rest positions of the torso's top-left minus (4, 0), in sprite cells. */
  torso: { x: readonly number[]; y: readonly number[] };
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const RIDE_SPECS: Record<"skate" | "scooter" | "bike", RideSpec> = {
  skate: { loop: [31, 33], mascot: [0, 2, 3], vehicle: [1, 4], torso: { x: [0], y: [7] } },
  scooter: {
    loop: [26, 28],
    mascot: [0, 1, 2],
    vehicle: [3, 4, 5, 6, 7, 8],
    torso: { x: [4], y: [6] },
  },
  bike: {
    loop: [12, 20],
    mascot: [0, 1, 2],
    vehicle: [3, 4, 5, 6],
    skip: (_x, y, v) => y <= 20 && (v === 3 || v === 4),
    torso: { x: range(3, 6), y: range(9, 12) },
  },
};

/** An offset from the limb's rest slot, or null when it hides behind the torso. */
export type Limb = readonly [number, number] | null;
export interface RidePose {
  /** The torso's own motion relative to its rest slot (the loop's bob). */
  body: readonly [number, number];
  armL: Limb;
  armR: Limb;
  legs: readonly [Limb, Limb, Limb, Limb];
}

type Box = readonly [number, number, number, number];
export const MASCOT_BOXES = {
  torso: [4, 0, 16, 12],
  armL: [0, 4, 8, 4],
  armR: [16, 4, 8, 4],
  leg0: [4, 11, 2, 5],
  leg1: [8, 11, 2, 5],
  leg2: [14, 11, 2, 5],
  leg3: [18, 11, 2, 5],
} as const satisfies Record<string, Box>;
const LIMBS = ["armL", "armR", "leg0", "leg1", "leg2", "leg3"] as const;

const G = 80; // grid size; sprite cells are shifted by PAD so negatives index safely
const PAD = 24;
const at = (x: number, y: number) => (y + PAD) * G + (x + PAD);

export interface FrameFit {
  pose: RidePose;
  /** T cells the rig can't reach (drawn as ride-owned fill) and cells it paints on empty. */
  miss: number;
  extra: number;
}

interface Target {
  t: Uint8Array;
  f: Uint8Array;
}

function stamp(grid: Uint8Array, box: Box, dx: number, dy: number, v: number) {
  for (let y = box[1]; y < box[1] + box[3]; y++)
    for (let x = box[0]; x < box[0] + box[2]; x++) grid[at(x + dx, y + dy)]! += v;
}

function fitFrame(
  tg: Target,
  tx: number,
  ty: number,
  bd: readonly [number, number],
): FrameFit & { score: number } {
  const offs: Record<(typeof LIMBS)[number], [number, number] | null> = {
    armL: [0, 0],
    armR: [0, 0],
    leg0: [0, 0],
    leg1: [0, 0],
    leg2: [0, 0],
    leg3: [0, 0],
  };
  const render = () => {
    const u = new Uint8Array(G * G);
    stamp(u, MASCOT_BOXES.torso, tx + bd[0], ty + bd[1], 1);
    for (const l of LIMBS) {
      const o = offs[l];
      if (o) stamp(u, MASCOT_BOXES[l], tx + o[0], ty + o[1], 1);
    }
    return u;
  };
  const measure = (u: Uint8Array) => {
    let miss = 0;
    let extra = 0;
    for (let i = 0; i < u.length; i++) {
      if (tg.t[i] && !u[i]) miss++;
      else if (u[i] && !tg.t[i] && !tg.f[i]) extra++;
    }
    return { miss, extra };
  };
  const total = () => {
    const { miss, extra } = measure(render());
    let pen = (Math.abs(bd[0]) + Math.abs(bd[1])) * 2;
    for (const l of LIMBS) {
      const o = offs[l];
      pen += o ? Math.abs(o[0]) + Math.abs(o[1]) : 8;
    }
    return (miss + extra) * 12 + pen;
  };
  // Torso stays put. Limbs: a few passes of exhaustive per-limb search.
  for (let pass = 0; pass < 3; pass++) {
    for (const l of LIMBS) {
      const arm = l.startsWith("arm");
      const dyMin = arm ? -5 : -3;
      const dyMax = arm ? 6 : 5;
      let best = total();
      let bo = offs[l];
      // A limb must keep at least two cells of overlap with the torso each way, so the action's
      // bob can't detach it.
      const joined = (o: [number, number]) => {
        const [bx, by, bw, bh] = MASCOT_BOXES[l];
        const [tx0, ty0, tw, th] = MASCOT_BOXES.torso;
        const ox = Math.min(bx + o[0] + bw, tx0 + bd[0] + tw) - Math.max(bx + o[0], tx0 + bd[0]);
        const oy = Math.min(by + o[1] + bh, ty0 + bd[1] + th) - Math.max(by + o[1], ty0 + bd[1]);
        return l.startsWith("arm") ? ox >= 3 && oy >= 3 : ox >= 2 && oy >= 1;
      };
      const tryOff = (o: [number, number] | null) => {
        if (o && !joined(o)) return;
        offs[l] = o;
        const s = total();
        if (s < best) {
          best = s;
          bo = o;
        }
      };
      tryOff(null);
      for (let dx = -9; dx <= 9; dx++) for (let dy = dyMin; dy <= dyMax; dy++) tryOff([dx, dy]);
      offs[l] = bo;
    }
  }
  const { miss, extra } = measure(render());
  const o = (l: (typeof LIMBS)[number]): Limb => offs[l];
  return {
    pose: {
      body: bd,
      armL: o("armL"),
      armR: o("armR"),
      legs: [o("leg0"), o("leg1"), o("leg2"), o("leg3")],
    },
    miss,
    extra,
    score: total(),
  };
}

export interface RideFit {
  /** Sprite cell that is the mascot's local (0, 0). */
  origin: readonly [number, number];
  /** Per loop frame: the pose and its residuals (before the fill is added). */
  frames: FrameFit[];
  /** Per loop frame: the sprite as rows of palette digits (vehicle) and B/S (fill). */
  rows: string[][];
  /** Crop of `rows` in mascot-local cells. */
  at: readonly [number, number];
  /** The eyes' base offset, so the rig's eyes land on the original's. */
  eye: readonly [number, number];
  ground: number;
  palette: Record<string, string>;
  loop: Uint8Array[];
}

export function fitRide(raw: RawRide, spec: RideSpec): RideFit {
  const loop = decode(raw).slice(spec.loop[0], spec.loop[1]);
  const targets: Target[] = loop.map((px) => {
    const t = new Uint8Array(G * G);
    const f = new Uint8Array(G * G);
    px.forEach((v, i) => {
      if (v === 255) return;
      const x = i % raw.w;
      const y = Math.floor(i / raw.w);
      if (spec.mascot.includes(v)) t[at(x, y)] = 1;
      else f[at(x, y)] = 1;
    });
    return { t, f };
  });
  let best: { tx: number; ty: number; frames: FrameFit[]; score: number } | null = null;
  for (const tx of spec.torso.x)
    for (const ty of spec.torso.y) {
      const fits = targets.map((tg) => fitFrame(tg, tx, ty, [0, 0]));
      const score = fits.reduce((s, f) => s + f.score, 0);
      if (!best || score < best.score) best = { tx, ty, frames: fits, score };
    }
  const { tx, ty } = best!;
  // With the rest slot fixed, each frame may also move the torso by a cell (the original's bob).
  best!.frames = targets.map((tg) => {
    let top = fitFrame(tg, tx, ty, [0, 0]);
    for (const dx of [-1, 0, 1])
      for (const dy of [-1, 0, 1]) {
        const c = fitFrame(tg, tx, ty, [dx, dy]);
        if (c.score < top.score) top = c;
      }
    return top;
  });

  const keep = (x: number, y: number, v: number) =>
    spec.vehicle.includes(v) && !spec.skip?.(x, y, v);

  // Fill: mascot cells the fitted rig leaves bare, in the original's colours.
  const cells: Array<Map<number, string>> = loop.map((px, k) => {
    const u = new Uint8Array(G * G);
    const p = best!.frames[k]!.pose;
    stamp(u, MASCOT_BOXES.torso, tx + p.body[0], ty + p.body[1], 1);
    const place = (box: Box, l: Limb) => l && stamp(u, box, tx + l[0], ty + l[1], 1);
    place(MASCOT_BOXES.armL, p.armL);
    place(MASCOT_BOXES.armR, p.armR);
    p.legs.forEach((l, i) => place(MASCOT_BOXES[`leg${i as 0}`], l));
    const m = new Map<number, string>();
    px.forEach((v, i) => {
      if (v === 255) return;
      const x = i % raw.w;
      const y = Math.floor(i / raw.w);
      if (keep(x, y, v)) m.set(i, String(v));
      else if (spec.mascot.includes(v) && !u[at(x, y)]) m.set(i, v === 2 ? "S" : "B");
    });
    return m;
  });
  let x0 = raw.w;
  let y0 = raw.h;
  let x1 = -1;
  let y1 = -1;
  for (const m of cells)
    for (const i of m.keys()) {
      x0 = Math.min(x0, i % raw.w);
      y0 = Math.min(y0, Math.floor(i / raw.w));
      x1 = Math.max(x1, i % raw.w);
      y1 = Math.max(y1, Math.floor(i / raw.w));
    }
  const rows = cells.map((m) =>
    range(y0, y1).map((y) =>
      range(x0, x1)
        .map((x) => m.get(y * raw.w + x) ?? ".")
        .join(""),
    ),
  );

  // Eyes: the glance that lays our eye cells over the original's ink best, inside the body.
  const ink = loop.map((px) => px.map((v) => (v === 0 ? 1 : 0)));
  let eye: [number, number] = [0, 0];
  let bestEye = -1;
  for (let dx = -2; dx <= 4; dx++) {
    let s = 0;
    loop.forEach((_, k) => {
      for (const ex of [6, 16])
        for (let a = 0; a < 2; a++)
          for (let b = 0; b < 2; b++) {
            const x = tx + ex + a + dx;
            const y = ty + 2 + b;
            if (ink[k]![y * raw.w + x]) s += 2;
          }
    });
    s -= Math.abs(dx) * 0.1;
    if (s > bestEye) {
      bestEye = s;
      eye = [dx, 0];
    }
  }

  const palette: Record<string, string> = {};
  for (const v of spec.vehicle) palette[String(v)] = raw.palette[v]!.toUpperCase();
  let low = 0;
  for (const px of loop)
    px.forEach((v, i) => {
      if (keep(i % raw.w, Math.floor(i / raw.w), v)) low = Math.max(low, Math.floor(i / raw.w));
    });
  return {
    origin: [tx, ty],
    frames: best!.frames,
    rows,
    at: [x0 - tx, y0 - ty],
    eye,
    ground: low - ty + 1,
    palette,
    loop,
  };
}

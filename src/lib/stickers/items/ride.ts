import { art } from "../model";
import { COLORS as K } from "../palette";
import { RIDE_SPRITES, type RideSprite } from "./ride-data";
import type { ItemDef, ItemPart } from "./types";

/**
 * Rides: anchor "ride" follows the body (never below the ground) and claims the legs. The claude.dev
 * rides also carry a fitted `rider` pose (scripts/ride-fit.ts): the torso, both arms and the legs
 * are placed to reproduce the original sprite's mascot cell for cell, and the vehicle is drawn at
 * its original position in front of the body, so the stem and bar overlap the rider exactly where
 * the original does. Loops with several states are split into one always-visible part (cells
 * identical in every state) and one part per state, shown by `seq[f % seq.length]`.
 */

const fill = (c: string) => c === "B" || c === "S";

/** Splits per-state ASCII into static + per-state parts. */
function spriteParts(s: RideSprite): ItemPart[] {
  const h = s.states[0]!.length;
  const w = s.states[0]![0]!.length;
  const [ox, oy] = s.at;
  const cell = (k: number, x: number, y: number) => s.states[k]!.at(y)!.charAt(x);
  const same = (x: number, y: number) => s.states.every((_, k) => cell(k, x, y) === cell(0, x, y));
  const parts: ItemPart[] = [];
  // B and S are body-coloured fill for cells the rig can't reach: their own parts, so the
  // vehicle alone is what thumbnails show.
  const emit = (pick: (x: number, y: number) => string, at?: ItemPart["at"]) => {
    for (const body of [false, true]) {
      const rows = Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (__, x) => {
          const c = pick(x, y);
          return fill(c) === body ? c : ".";
        }).join(""),
      );
      if (rows.some((r) => /[^.]/.test(r))) {
        parts.push({
          layers: art(rows, ox, oy, s.palette),
          ...(at ? { at } : {}),
          ...(body ? { body } : {}),
        });
      }
    }
  };
  emit((x, y) => (same(x, y) ? cell(0, x, y) : "."));
  s.states.forEach((_, k) =>
    emit(
      (x, y) => (same(x, y) ? "." : cell(k, x, y)),
      (f) => (s.seq[f % s.seq.length] === k ? [0, 0] : null),
    ),
  );
  return parts;
}

/**
 * The picker's thumbnail of a ride is the vehicle alone, from the first state. The rider's own
 * dark cells (shoes and shadows between the legs: `ink` inside `cols`) and the body-coloured fill
 * that completes a posed rider are not the vehicle; each is replaced by the frame colour beside
 * it (the frame runs on behind where the legs were) or dropped when nothing is beside it; small
 * holes left in the frame where a leg crossed it are closed with the frame colour.
 */
const THUMB: Partial<
  Record<
    string,
    {
      ink: string;
      frame: string;
      cols: readonly [number, number];
      rows: readonly [number, number];
    }
  >
> = {
  scooter: { ink: "3", frame: "45", cols: [0, 17], rows: [6, 10] },
  bike: { ink: "5", frame: "4", cols: [7, 18], rows: [7, 12] },
};

function thumbParts(id: string, s: RideSprite): ItemPart[] | undefined {
  const t = THUMB[id];
  if (!t) return undefined;
  const src = s.states[0]!.map((r) => r.split(""));
  const gap = (x: number, y: number) => {
    const c = src[y]?.[x] ?? ".";
    if (fill(c)) return true;
    return c === t.ink && x >= t.cols[0] && x <= t.cols[1] && y >= t.rows[0] && y <= t.rows[1];
  };
  const rows = src.map((r, y) =>
    r
      .map((c, x) => {
        if (!gap(x, y)) return c;
        for (const dx of [-1, 1, -2, 2]) {
          const n = src[y]?.[x + dx];
          if (n && n !== "." && !gap(x + dx, y)) return n;
        }
        return ".";
      })
      .join(""),
  );
  // Then the legs' own holes in the frame: up to three empty cells between two frame cells.
  const closed = rows.map((r) => {
    const out = [...r];
    for (let x = 0; x < out.length; x++) {
      if (out[x] !== "." || x === 0 || !t.frame.includes(out[x - 1]!)) continue;
      let e = x;
      while (out[e] === ".") e++;
      if (e - x <= 3 && e < out.length && t.frame.includes(out[e]!)) out.fill(out[x - 1]!, x, e);
      x = e;
    }
    return out.join("");
  });
  return [{ layers: art(closed, s.at[0], s.at[1], s.palette) }];
}

const sprite = (id: "skate" | "scooter" | "bike", name: string): ItemDef => {
  const s = RIDE_SPRITES[id];
  return {
    id,
    name,
    slot: "ride",
    anchor: "ride",
    claims: "legs",
    seat: "stand",
    ground: s.ground,
    eye: s.eye,
    rider: (f) => s.pose[f % s.pose.length]!,
    parts: spriteParts(s),
    thumb: thumbParts(id, s),
  };
};

// Dala horse facing right, red with a kurbits saddle. Its back is row 11, so the torso's last row
// sits behind it. The legs hop in diagonal pairs.
const HORSE_PALETTE = {
  R: K.red,
  D: K.redDark,
  W: K.cream,
  B: K.blue,
  Y: K.yellow,
  I: K.ink,
  H: K.steel,
};
const HORSE_BODY = [
  ".........................",
  "R........................",
  "RR.......................",
  "RRRRRRBWBBWBBWBBRRYRRRRRD",
  "RRRRRRBWYBWYBWYBRRBRRR...",
  "DDRRRRBBBBBBBBBBRRYRRR...",
  "..RRRRYYYYYYYYYYRRRRR....",
  "..DDDDDDDDDDDDDDDDDDD....",
];
// The neck and head rise at the right, in front of Claude and clear of the eyes (which sit at
// x 18..20): blue and yellow mane down the back of the neck, an ear, a cream muzzle. Claude's
// right hand rests on the neck below the head.
const HORSE_HEAD = [
  "....RR..",
  "...RRRR.",
  "..YRRRIR",
  "..BRRRRR",
  "..YRRRRW",
  "..BRRRRW",
  "..YRRRRR",
  "..BRRR..",
  "..YRRRR.",
  "..BRRRR.",
];
const horseLegs = (cols: number[]) =>
  [0, 1, 2, 3].map((r) =>
    Array.from({ length: 25 }, (_, c) =>
      cols.some((x) => c === x || c === x + 1) ? (r === 3 ? "H" : "R") : ".",
    ).join(""),
  );
const hop =
  (odd: boolean): ItemPart["at"] =>
  (f, n) =>
    Math.floor((f * 4) / n) % 2 === (odd ? 1 : 0) ? [0, -1] : [0, 0];
const HORSE: ItemPart[] = [
  { layers: art(HORSE_BODY, -1, 8, HORSE_PALETTE) },
  { layers: art(HORSE_HEAD, 19, 1, HORSE_PALETTE) },
  { layers: art(horseLegs([3, 15]), -1, 16, HORSE_PALETTE), at: hop(false) },
  { layers: art(horseLegs([7, 19]), -1, 16, HORSE_PALETTE), at: hop(true) },
];

export const RIDE: ItemDef[] = [
  sprite("skate", "Skateboard"),
  sprite("scooter", "Scooter"),
  sprite("bike", "Bike"),
  {
    id: "dala",
    name: "Dala horse",
    slot: "ride",
    anchor: "ride",
    claims: "legs",
    seat: "hide",
    ground: 20,
    eye: [2, 0],
    handsOver: true,
    // Claude sits in the saddle: the horse's back covers the hips, the right hand rests on its
    // neck and the left arm hides.
    rider: () => ({
      body: [0, 3],
      armL: null,
      armR: [-1, 4],
      legs: [null, null, null, null],
    }),
    parts: HORSE,
  },
];

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
    rider: () => ({ body: [0, 3], armL: null, armR: [-1, 4], legs: [null, null, null, null] }),
    parts: HORSE,
  },
];

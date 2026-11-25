import { art } from "../model";
import { COLORS as K } from "../palette";
import { RIDE_SPRITES, type RideSprite } from "./ride-data";
import type { ItemDef, ItemPart } from "./types";

/**
 * Rides: anchor "ride" follows the body (never below the ground), claims the legs. The art is two
 * layers: `back` is drawn behind the legs and torso, `front` over the torso and under the arms.
 * `seat: "stand"` keeps the legs visible on the ride, `"hide"` tucks them behind its front layer.
 * Loops with several wheel states are split into one always-visible part (cells identical in every
 * state) and one part per state, shown by `seq[f % seq.length]`.
 */

type Split = (x: number, y: number) => boolean;

/** Behind the legs and torso: whatever of the ride would otherwise cut across the body. */
const behindBody: Split = (x, y) => y <= 14 && x >= 4 && x <= 19;

/** Splits per-state ASCII into static + per-state parts, each cell routed to back or front. */
function spriteParts(s: RideSprite, isBack: Split = () => false): ItemPart[] {
  const h = s.states[0]!.length;
  const w = s.states[0]![0]!.length;
  const [ox, oy] = s.at;
  const cell = (k: number, x: number, y: number) => s.states[k]!.at(y)!.charAt(x);
  const same = (x: number, y: number) => s.states.every((_, k) => cell(k, x, y) === cell(0, x, y));
  const parts: ItemPart[] = [];
  const emit = (pick: (x: number, y: number) => string, at?: ItemPart["at"]) => {
    for (const z of ["back", "front"] as const) {
      const rows = Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (__, x) => {
          const c = pick(x, y);
          return c !== "." && isBack(ox + x, oy + y) === (z === "back") ? c : ".";
        }).join(""),
      );
      if (rows.some((r) => /[^.]/.test(r))) {
        parts.push({ z, layers: art(rows, ox, oy, s.palette), ...(at ? { at } : {}) });
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
  "....................RR.R.",
  "..................YRRRRRR",
  "RR................BRRRIRR",
  "RRRRRRBWBBWBBWBBRRYRRRRRD",
  "RRRRRRBWYBWYBWYBRRBRRR...",
  "DDRRRRBBBBBBBBBBRRYRRR...",
  "..RRRRYYYYYYYYYYRRRRR....",
  "..DDDDDDDDDDDDDDDDDDD....",
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
  { layers: art(horseLegs([3, 15]), -1, 16, HORSE_PALETTE), at: hop(false) },
  { layers: art(horseLegs([7, 19]), -1, 16, HORSE_PALETTE), at: hop(true) },
];

export const RIDE: ItemDef[] = [
  {
    id: "skate",
    name: "Skateboard",
    slot: "ride",
    anchor: "ride",
    claims: "legs",
    seat: "stand",
    ground: 22,
    parts: spriteParts(RIDE_SPRITES.skate, behindBody),
  },
  {
    id: "scooter",
    name: "Scooter",
    slot: "ride",
    anchor: "ride",
    claims: "legs",
    seat: "stand",
    ground: 21,
    parts: spriteParts(RIDE_SPRITES.scooter, behindBody),
  },
  {
    id: "bike",
    name: "Bike",
    slot: "ride",
    anchor: "ride",
    claims: "legs",
    seat: "hide",
    ground: 19,
    parts: spriteParts(RIDE_SPRITES.bike, behindBody),
  },
  {
    id: "dala",
    name: "Dala horse",
    slot: "ride",
    anchor: "ride",
    claims: "legs",
    seat: "hide",
    ground: 20,
    parts: HORSE,
  },
];

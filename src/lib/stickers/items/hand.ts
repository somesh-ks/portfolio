/**
 * ITEM FORMAT (every registry file in this folder uses it; docs/stickers.md has the long form).
 *
 *   { id, name, slot, anchor, claims?, rows, at: [x, y], palette }
 *
 * - `rows`: ASCII, one char per cell. '.' or ' ' is empty, any other char looks up `palette`.
 *   Rows may differ in length; runs merge into few rects, so draw freely.
 * - `at`: the cell of the top-left char, in mascot cells. The body is 24 x 16; head x 4..19,
 *   rows 0..11; left hand x 0..3 rows 4..6; negative values are fine (hats, flags).
 * - `palette`: char -> hex. Use `COLORS` from ../palette so every output agrees.
 * - `anchor`: what the art follows (head, face, handL, front, ground, lane, ride).
 * - `claims`: "arms" for `front` items (add `hold`: where each arm goes, per frame) or "legs"
 *   for rides (add `seat`). Everything else leaves the action in charge.
 * - Optional: `layers` (hand-built, for alpha), `parts` (several pieces with their own `at(f, n)`
 *   offset per frame, null hides), `pose(f, n)` (offset or hide for the whole item), `eyeTint`.
 *
 * handL items are held in the left fist: draw the grip at x 0..1, rows 4..6 and add FIST last
 * so the hand sits over it. They move with the left arm.
 */
import { art, type Layer, rectLayer } from "../model";
import { COLORS as K } from "../palette";
import type { ItemDef } from "./types";

const FIST: Layer[] = [
  rectLayer(K.body, [[0, 4, 2, 3]]),
  rectLayer(K.light, [[0, 4, 2, 1]]),
  rectLayer(K.shade, [[0, 6, 2, 1]]),
];

const tap = (f: number) => f % 4 < 2;

export const HAND: ItemDef[] = [
  {
    id: "mug",
    name: "Mug",
    slot: "hand",
    anchor: "handL",
    layers: [
      ...art(["LCCCL", "MMMMM", "MMMMM", "MMMMM", "DDDDD"], -4, 1, {
        L: K.skyLight,
        C: "#5A3A28",
        M: K.sky,
        D: K.skyDark,
      }),
      rectLayer(K.sky, [
        [1, 2, 2, 1],
        [2, 3, 1, 2],
        [1, 5, 2, 1],
      ]),
      ...FIST,
    ],
  },
  {
    id: "flag",
    name: "Swedish flag",
    slot: "hand",
    anchor: "handL",
    layers: [
      rectLayer(K.steel, [[0, -3, 1, 11]]),
      rectLayer(K.blue, [[-7, -3, 7, 5]]),
      rectLayer(K.yellow, [
        [-5, -3, 2, 5],
        [-7, -1, 7, 1],
      ]),
      ...FIST,
    ],
  },
  {
    id: "balloon",
    name: "Balloon",
    slot: "hand",
    anchor: "handL",
    layers: [
      rectLayer(K.steel, [[0, -1, 1, 6]]),
      ...art([".RRR.", "RRRRR", "RRRRR", "RRRRR", ".RRR.", "..D.."], -2, -7, {
        R: K.red,
        D: K.redDark,
      }),
      rectLayer(K.pink, [[-1, -6, 1, 2]]),
      ...FIST,
    ],
  },
  {
    id: "heart",
    name: "Heart",
    slot: "hand",
    anchor: "handL",
    layers: [
      ...art(["XX.XX", "XXXXX", "XXXXX", ".XXX.", "..X.."], -2, 1, { X: K.red }),
      rectLayer(K.redDark, [[1, 3, 1, 1]]),
      rectLayer(K.pink, [
        [-2, 1, 1, 1],
        [-2, 2, 1, 1],
      ]),
      ...FIST,
    ],
  },
  {
    id: "laptop",
    name: "Laptop",
    slot: "hand",
    anchor: "front",
    claims: "arms",
    z: 25,
    hold: (f) => (tap(f) ? { armL: [3, 3], armR: [-3, 4] } : { armL: [3, 4], armR: [-3, 3] }),
    layers: [
      rectLayer(K.coal, [[4, 7, 16, 7]]),
      rectLayer(K.steel, [
        [4, 7, 16, 1],
        [4, 7, 1, 7],
        [19, 7, 1, 7],
      ]),
      rectLayer("#B0AEA5", [[3, 14, 18, 1]]),
      ...art([".XX.", "XXXX", "XXXX", ".XX."], 10, 9, { X: K.body }),
    ],
  },
  {
    id: "book",
    name: "Book",
    slot: "hand",
    anchor: "front",
    claims: "arms",
    z: 25,
    hold: () => ({ armL: [3, 2], armR: [-3, 2] }),
    layers: [
      rectLayer(K.cream, [[7, 6, 10, 5]]),
      rectLayer(K.coal, [[11, 6, 2, 5]]),
      rectLayer(K.sky, [
        [8, 7, 3, 1],
        [8, 9, 2, 1],
      ]),
      rectLayer(K.moss, [
        [13, 7, 3, 1],
        [13, 9, 3, 1],
      ]),
    ],
  },
  {
    id: "console",
    name: "Game console",
    slot: "hand",
    anchor: "front",
    claims: "arms",
    z: 25,
    hold: (f) => (tap(f) ? { armL: [5, 1], armR: [-5, 2] } : { armL: [5, 2], armR: [-5, 1] }),
    layers: [
      rectLayer(K.steel, [[9, 6, 6, 6]]),
      rectLayer(K.moss, [[10, 7, 4, 3]]),
      rectLayer(K.coal, [[10, 11, 2, 1]]),
      rectLayer(K.body, [
        [13, 11, 1, 1],
        [14, 10, 1, 1],
      ]),
    ],
  },
];

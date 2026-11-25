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
 * handL items are the object only: draw the grip at x 0..1, rows 4..6. The rig draws the left hand
 * (a fist) over that grip, and the item moves with the left arm. Never draw body-coloured pixels
 * in an item (a test checks, VIP pass and laptop logo aside).
 */
import { art, rectLayer } from "../model";
import { COLORS as K } from "../palette";
import type { ItemDef } from "./types";

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
    ],
  },
  {
    id: "laptop",
    name: "Laptop",
    slot: "hand",
    anchor: "front",
    claims: "arms",
    z: 25,
    // Hands at the laptop's sides, each covering its outer edge cell, not blocks on the screen.
    hold: (f) => (tap(f) ? { armL: [1, 3], armR: [-1, 4] } : { armL: [1, 4], armR: [-1, 3] }),
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
      rectLayer(K.tomato, [
        [13, 11, 1, 1],
        [14, 10, 1, 1],
      ]),
    ],
  },
  {
    id: "kanelbulle",
    name: "Kanelbulle",
    slot: "hand",
    anchor: "handL",
    layers: [
      ...art(
        [
          "..DDDD..",
          ".DLLWLD.",
          "DLSSSSLD",
          "DLSLLSLD",
          "DWSLSSLD",
          "DLSLLLLD",
          ".DLSSSD.",
          "..DDDD..",
        ],
        -8,
        1,
        { D: K.dough, L: K.doughLight, S: K.swirl, W: K.cream },
      ),
    ],
  },
  {
    id: "vippass",
    name: "VIP pass",
    slot: "hand",
    anchor: "handL",
    layers: [
      ...art(
        [
          "....B....",
          "....B....",
          "...GGG...",
          "DDDDDDDDD",
          "DBBBBBBBD",
          "DOOOWYYYD",
          "DKOKWYKYD",
          "DOOOWWWWD",
          "DWKKKKKWD",
          "DWWWWWWWD",
          "DWKWKKWKD",
          "DDDDDDDDD",
        ],
        -9,
        -3,
        { B: K.blue, G: K.gold, D: K.skyDark, W: K.white, O: K.body, K: K.ink, Y: K.yellow },
      ),
    ],
  },
  {
    id: "spatula",
    name: "Spatula",
    slot: "hand",
    anchor: "handL",
    layers: [
      // The shaft runs well above and below the fist so it reads as a handle, not a stick.
      ...art(
        [
          "WWWW",
          "WDDW",
          "WDDW",
          "WWWW",
          ".HH.",
          ".HH.",
          ".HH.",
          ".HH.",
          ".HH.",
          ".HH.",
          ".HH.",
          ".HH.",
          ".HH.",
          ".HH.",
        ],
        -1,
        -4,
        { W: K.woodLight, D: K.woodDark, H: K.wood },
      ),
    ],
  },
  {
    id: "crayfish",
    name: "Crayfish",
    slot: "hand",
    anchor: "handL",
    layers: [
      ...art(
        [
          "R.R......",
          "RRR.RR...",
          ".RRRRRRR.",
          "..KRRDRDR",
          "..RRRRRRR",
          ".RRDRDRR.",
          "RRR.RR...",
          "R.R......",
        ],
        -9,
        1,
        { R: K.crayfish, D: K.crayDark, K: K.ink },
      ),
    ],
  },
  {
    id: "kite",
    name: "Kite",
    slot: "hand",
    anchor: "handL",
    layers: [
      // The claude.dev kite is 15 cells wide, too big beside our 24-cell body, so this one is
      // redrawn with its palette: gold sail, dark spars, pale string to the fist.
      ...art(
        [
          "....G....",
          "...GGG...",
          "..GGDGG..",
          ".GGGDGGG.",
          "GGGGDGGGG",
          "DDDDDDDDD",
          ".GGGDGGG.",
          "..GGDGG..",
          "...GDG...",
          "....D....",
        ],
        -12,
        -7,
        { G: "#EFAC54", D: "#2F1900" },
      ),
      rectLayer("#C1C0B5", [
        [-8, 3, 2, 1],
        [-6, 4, 3, 1],
        [-3, 5, 3, 1],
      ]),
    ],
  },
  {
    id: "metro",
    name: "Metro sign",
    slot: "hand",
    anchor: "ground",
    at: [-10, 2],
    palette: { K: K.navy, W: K.white, B: K.blue, S: K.steel },
    rows: [
      ".KKKKKK.",
      "KWWWWWWK",
      "KWBBBBWK",
      "KWWBBWWK",
      "KWWBBWWK",
      "KWWBBWWK",
      "KWWWWWWK",
      ".KKKKKK.",
      "...SS...",
      "...SS...",
      "...SS...",
      "...SS...",
      "...SS...",
      "..SSSS..",
    ],
  },
  {
    id: "vasa",
    name: "Vasa ship",
    slot: "hand",
    anchor: "ground",
    at: [-13, 1],
    palette: { M: K.hull, W: K.cream, Y: K.yellow, B: K.blue, K: K.hullDark, D: K.hullDark },
    rows: [
      ".....MBY....",
      ".....M......",
      "...WWYYWW...",
      "...YYYYYY...",
      "...WWYYWW...",
      ".....M......",
      "..WWWWWWWW..",
      "..WWWYYWWW..",
      "..YYYYYYYY..",
      "..WWWYYWWW..",
      ".....M......",
      "MMMMMMMMMMMM",
      "MKMKMKMKMKMM",
      ".DDDDDDDDDD.",
      "BBBBBBBBBBBB",
    ],
  },
  {
    id: "meatballs",
    name: "Meatballs",
    slot: "hand",
    anchor: "front",
    claims: "arms",
    z: 25,
    hold: () => ({ armL: [3, 3], armR: [-3, 3] }),
    at: [3, 5],
    palette: { B: K.meat, H: K.meatHi, R: K.red, G: K.lettuce, W: K.white, P: K.ring },
    rows: [
      "..BB...BB...BB....",
      ".BHBB.BHBB.BHBB.RG",
      ".BBBB.BBBB.BBBB.RR",
      "..PPPPPPPPPPPPPP..",
      ".PWWWWWWWWWWWWWWP.",
      "PWWWWWWWWWWWWWWWWP",
      ".PPPPPPPPPPPPPPPP.",
    ],
  },
  {
    id: "fredagsmys",
    name: "Fredagsmys",
    slot: "hand",
    anchor: "front",
    claims: "arms",
    z: 25,
    hold: () => ({ armL: [3, 3], armR: [-3, 3] }),
    at: [4, 5],
    palette: {
      G: K.lettuce,
      R: K.tomato,
      Y: K.yellow,
      T: K.taco,
      M: K.meat,
      O: K.tray,
      L: K.trayLight,
      D: K.trayDark,
    },
    rows: [
      "......GGRGG.....",
      "....GGGRGGGYY...",
      "...TTTTTTTTTTT..",
      "..TTMMTTTTTTTT..",
      "...TTTTTTTTTT...",
      "OOOOOOOOOOOOOOOO",
      "OLLLLLLLLLLLLLLO",
      "DDDDDDDDDDDDDDDD",
    ],
  },
];

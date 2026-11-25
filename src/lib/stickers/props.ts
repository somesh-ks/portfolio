import { art, type Layer, rectLayer } from "./model";

/** Literal colours so every output (SVG, Lottie, raster) agrees without CSS variables. */
export const COLORS = {
  body: "#D97757",
  shade: "#BF6747",
  light: "#E48C6D",
  ink: "#141413",
  cream: "#FAF9F5",
  sand: "#E8C9A0",
  sky: "#6A9BCC",
  skyDark: "#4A78A8",
  skyLight: "#A9C5E2",
  moss: "#788C5D",
  leaf: "#5E7A3E",
  gold: "#F2C766",
  goldDark: "#C99A2E",
  steel: "#3D3D3A",
  coal: "#262624",
  blue: "#006AA7",
  yellow: "#FECC00",
  red: "#E0555B",
  redDark: "#B8374C",
  pink: "#F0A0AE",
  petal: "#E88CA0",
  purple: "#8B6B8E",
  ring: "#D8D6CE",
  white: "#FFFFFF",
} as const;
const K = COLORS;

export type Slot = "head" | "face" | "hand";
export type PropId =
  | "beanie"
  | "party"
  | "headphones"
  | "toque"
  | "crown"
  | "flowers"
  | "shades"
  | "mug"
  | "flag"
  | "balloon"
  | "heart";

export const PROPS: readonly { id: PropId; name: string; slot: Slot }[] = [
  { id: "beanie", name: "Beanie", slot: "head" },
  { id: "party", name: "Party hat", slot: "head" },
  { id: "headphones", name: "Headphones", slot: "head" },
  { id: "toque", name: "Chef hat", slot: "head" },
  { id: "crown", name: "Crown", slot: "head" },
  { id: "flowers", name: "Flower crown", slot: "head" },
  { id: "shades", name: "Shades", slot: "face" },
  { id: "mug", name: "Mug", slot: "hand" },
  { id: "flag", name: "Swedish flag", slot: "hand" },
  { id: "balloon", name: "Balloon", slot: "hand" },
  { id: "heart", name: "Heart", slot: "hand" },
];

// Mascot-local geometry: body grid 24 wide, 16 tall. Head x 4..19, top row 0, eyes rows 2..3.
// Left arm (the hand slot) is x 0..3, rows 4..6. Props are drawn in front of the body.
// Hand props are drawn so a body-coloured fist sits in front of the grip.

const FIST: Layer = rectLayer(K.body, [[0, 4, 2, 3]]);

const ART: Record<PropId, Layer[]> = {
  beanie: art(
    [
      "......gggg......",
      "......gggg......",
      "....BBBBBBBB....",
      "...BBBBBBBBBB...",
      "..SSSSSSSSSSSS..",
      ".BBBBBBBBBBBBBB.",
      "CCCCCCCCCCCCCCCC",
      "DDDDDDDDDDDDDDDD",
    ],
    4,
    -7,
    { g: K.gold, B: K.sky, S: K.skyDark, C: K.sand, D: "#C9A97A" },
  ),
  party: art(
    [
      "...GG...",
      "...PP...",
      "..PPPP..",
      "..YYYY..",
      ".PPPPPP.",
      ".YYYYYY.",
      "PPPPPPPP",
      "YYYYYYYY",
      "PPPPPPPP",
    ],
    8,
    -8,
    { G: K.gold, P: K.purple, Y: K.gold },
  ),
  headphones: [
    rectLayer(K.coal, [
      [6, -2, 12, 1],
      [5, -1, 1, 1],
      [18, -1, 1, 1],
      [4, 0, 1, 1],
      [19, 0, 1, 1],
      [3, 1, 1, 4],
      [20, 1, 1, 4],
    ]),
    rectLayer(K.sky, [
      [4, 1, 1, 4],
      [19, 1, 1, 4],
    ]),
  ],
  toque: art(
    [
      "..IIII..IIII..",
      ".IWWWWIIWWWWI.",
      "IWWWWWWWWWWWWI",
      "IWWSWWWWWWSWWI",
      "IWWSWWWWWWSWWI",
      ".IWWWWWWWWWWI.",
      "..IWWWWWWWWI..",
      "..IWSWWWWSWI..",
      "..IWWWWWWWWI..",
      "..IIIIIIIIII..",
    ],
    5,
    -9,
    { I: K.ink, W: K.cream, S: K.sand },
  ),
  crown: art(
    [
      "GG...GG...GG",
      "GG...GG...GG",
      "GGG.GGGG.GGG",
      "GGGGGGGGGGGG",
      "GGRGGGBGGRGG",
      "DDDDDDDDDDDD",
      "DDDDDDDDDDDD",
    ],
    6,
    -6,
    { G: K.gold, D: K.goldDark, R: K.red, B: K.sky },
  ),
  flowers: art(
    [
      "..P....R....B...",
      ".PYP..RYR..BYB..",
      "GGPGGGGRGGGGBGGG",
      "GGGGGGGGGGGGGGGG",
      "GGGGGGGGGGGGGGGG",
    ],
    4,
    -4,
    { Y: K.yellow, P: K.petal, R: K.red, B: K.sky, G: K.leaf },
  ),
  shades: art(
    [".IIIII....IIIII.", ".ISSLIIIIIILSSI.", ".ISSSI....ISSSI.", ".IIIII....IIIII."],
    4,
    1,
    { I: K.ink, S: K.steel, L: K.sky },
  ),
  mug: art(
    ["LCCCCL..", "MMMMMMHH", "MMMMMM.H", "MMMMMM.H", "MMMMMMHH", "MMMMMM..", "DDDDDD.."],
    -5,
    0,
    { L: K.skyLight, C: "#5A3A28", M: K.sky, D: K.skyDark, H: K.sky },
  ),
  flag: [
    rectLayer(K.steel, [[0, -10, 1, 19]]),
    rectLayer(K.blue, [
      [-9, -9, 5, 3],
      [-2, -9, 2, 3],
      [-9, -4, 5, 3],
      [-2, -4, 2, 3],
    ]),
    rectLayer(K.yellow, [
      [-4, -9, 2, 8],
      [-9, -6, 9, 2],
    ]),
    FIST,
  ],
  balloon: [
    rectLayer(K.steel, [[0, -5, 1, 9]]),
    ...art(
      ["..RRR..", ".RRRRR.", "RRRRRRR", "RRRRRRR", "RRRRRRR", ".RRRRR.", "..RRR..", "...D..."],
      -3,
      -13,
      { R: K.red, D: K.redDark },
    ),
    rectLayer(K.pink, [[-2, -11, 1, 2]]),
    FIST,
  ],
  heart: [
    ...art([".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."], -5, 0, {
      X: K.red,
    }),
    rectLayer(K.redDark, [
      [0, 2, 2, 1],
      [0, 3, 1, 1],
    ]),
    rectLayer(K.pink, [
      [-4, 1, 1, 1],
      [-5, 2, 1, 1],
    ]),
    FIST,
  ],
};

const SHADES_Z = 35;
const Z_HEAD = 50;
const Z_HAND = 60;

export function propLayers(id: PropId): Layer[] {
  return ART[id];
}
export function propZ(id: PropId): number {
  if (id === "shades") return SHADES_Z;
  return PROPS.find((p) => p.id === id)?.slot === "hand" ? Z_HAND : Z_HEAD;
}
export const slotOf = (id: PropId): Slot => PROPS.find((p) => p.id === id)?.slot ?? "head";

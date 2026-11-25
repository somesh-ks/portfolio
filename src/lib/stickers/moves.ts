import { art, rectLayer } from "./model";
import { type ClipSpec, type OwnProp, type Pose } from "./rig";
import { COLORS as K, type Slot } from "./props";

type V = [number, number];
const R = Math.round;

// ---------- the moves' own props ----------

const LAPTOP: OwnProp = {
  id: "laptop",
  z: "mid",
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
};

const CODE_LINES: Array<Array<[x: number, w: number, color: string]>> = [
  [
    [6, 3, K.body],
    [10, 5, K.cream],
    [16, 2, K.sand],
  ],
  [
    [8, 4, K.sky],
    [13, 3, K.cream],
    [17, 2, K.moss],
  ],
  [
    [8, 6, K.cream],
    [15, 3, K.body],
  ],
];
const CODE_CHUNKS = CODE_LINES.flatMap((line, li) =>
  line.map(([x, w, c], ci) => ({ id: `code${li}_${ci}`, x, y: -9 + li * 2, w, c })),
);
const CODE_START = [2, 4, 6, 9, 11, 13, 16, 18];
const CODE_PROPS: OwnProp[] = [
  {
    id: "card",
    z: "front",
    layers: [
      rectLayer(K.coal, [[4, -12, 16, 9]]),
      rectLayer(K.steel, [[4, -12, 16, 1]]),
      rectLayer(K.body, [[5, -12, 1, 1]]),
      rectLayer(K.sand, [[7, -12, 1, 1]]),
      rectLayer(K.moss, [[9, -12, 1, 1]]),
    ],
  },
  ...CODE_CHUNKS.map((ch) => ({
    id: ch.id,
    z: "front" as const,
    layers: [rectLayer(ch.c, [[ch.x, ch.y, ch.w, 1]])],
  })),
];

const BULB: OwnProp = {
  id: "bulb",
  z: "front",
  layers: art(
    ["..YYY..", ".YYYYY.", ".YWYYY.", ".YYYYY.", "..YYY..", "..GGG..", "...G..."],
    15,
    -12,
    { Y: K.gold, W: K.cream, G: K.steel },
  ),
};
const RAYS: OwnProp = {
  id: "rays",
  z: "front",
  layers: [
    rectLayer(K.gold, [
      [12, -9, 2, 1],
      [23, -9, 2, 1],
      [17, -14, 1, 2],
      [14, -13, 1, 1],
      [22, -13, 1, 1],
    ]),
  ],
};
const DOT1: OwnProp = { id: "dot1", z: "front", layers: [rectLayer(K.sand, [[21, -1, 1, 1]])] };
const DOT2: OwnProp = { id: "dot2", z: "front", layers: [rectLayer(K.sand, [[22, -3, 2, 2]])] };

const Z_ART = [
  ["XXXX", "..X.", ".X..", "XXXX"],
  ["XXXXX", "...X.", "..X..", ".X...", "XXXXX"],
  ["XXXXXX", "....X.", "...X..", "..X...", ".X....", "XXXXXX"],
];
const Z_PROPS: OwnProp[] = [0, 1, 2].flatMap((i) =>
  Z_ART.map((rows, s) => ({
    id: `z${i}_${s}`,
    z: "front" as const,
    layers: art(rows, 0, 0, { X: K.sky }),
  })),
);

const NOTE = [".XX", ".X.", ".X.", "XX.", "XX."];
const NOTE_PROPS: OwnProp[] = [
  { id: "note0", z: "front", layers: art(NOTE, 0, 0, { X: K.sky }) },
  { id: "note1", z: "front", layers: art(NOTE, 0, 0, { X: K.sand }) },
];

const MUG: OwnProp = {
  id: "mug",
  z: "front",
  layers: [
    rectLayer(K.body, [[10, 6, 4, 4]]),
    rectLayer(K.cream, [[11, 6, 2, 1]]),
    rectLayer(K.shade, [[14, 7, 2, 2]]),
    rectLayer(K.coal, [[14, 8, 1, 1]]),
  ],
};
const STEAM_PROPS: OwnProp[] = [0, 1, 2].map((i) => ({
  id: `steam${i}`,
  z: "front" as const,
  layers: [
    rectLayer(K.sand, [
      [11, 4 - i * 2, 2, 1],
      [12, 3 - i * 2, 1, 1],
    ]),
  ],
}));

const BOOK: OwnProp = {
  id: "book",
  z: "front",
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
};

const GAMEBOY: OwnProp = {
  id: "gameboy",
  z: "front",
  layers: [
    rectLayer(K.steel, [[9, 6, 6, 6]]),
    rectLayer(K.moss, [[10, 7, 4, 3]]),
    rectLayer(K.coal, [[10, 11, 2, 1]]),
    rectLayer(K.body, [
      [13, 11, 1, 1],
      [14, 10, 1, 1],
    ]),
  ],
};

const HEART_MAIN: OwnProp = {
  id: "heart_main",
  z: "front",
  layers: art([".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."], 8, 5, {
    X: K.body,
  }),
};
const MINI_HEARTS: OwnProp[] = [0, 1].map((i) => ({
  id: `mheart${i}`,
  z: "front" as const,
  layers: art([".X.X.", "XXXXX", ".XXX.", "..X.."], 0, 0, { X: K.body }),
}));

// ---------- moves ----------

const blink = (f: number, at: number[]) => at.includes(f);

const idle: ClipSpec = {
  frames: 24,
  pose: (f) => {
    const down = f >= 10 && f < 22;
    const arm: V = f === 10 ? [0, -1] : f === 22 ? [0, 1] : [0, 0];
    return {
      body: [0, down ? 1 : 0],
      armL: arm,
      armR: arm,
      eyes: blink(f, [15, 16]) ? "closed" : "open",
      eye: f >= 4 && f <= 8 ? [1, 0] : f >= 19 && f <= 21 ? [-1, 0] : [0, 0],
    };
  },
};

const wave: ClipSpec = {
  frames: 24,
  pose: (f) => ({
    body: [0, f % 12 >= 6 ? 1 : 0],
    armR: f % 6 < 3 ? [0, -4] : [0, -2],
    eyes: f >= 2 && f <= 20 ? "happy" : "open",
  }),
};

const walk: ClipSpec = {
  frames: 24,
  pose: (f) => {
    const A = f % 12 < 6;
    const lift: [number, number, number, number] = A ? [-1, 0, 0, -1] : [0, -1, -1, 0];
    return {
      body: [0, f % 6 < 3 ? 1 : 0],
      legs: lift,
      armL: A ? [0, -1] : [0, 1],
      armR: A ? [0, 1] : [0, -1],
      eyes: blink(f, [20, 21]) ? "closed" : "open",
    };
  },
};

const code: ClipSpec = {
  frames: 24,
  props: [LAPTOP, ...CODE_PROPS],
  pose: (f) => {
    const tap = f % 4 < 2;
    const fx: NonNullable<Pose["fx"]> = { laptop: [0, 0], card: [0, 0] };
    CODE_CHUNKS.forEach((ch, i) => {
      if (f >= (CODE_START[i] ?? 99)) fx[ch.id] = [0, 0];
    });
    return {
      body: [0, f % 12 >= 6 ? 1 : 0],
      armL: tap ? [3, 3] : [3, 4],
      armR: tap ? [-3, 4] : [-3, 3],
      eyes: blink(f, [19, 20]) ? "closed" : "open",
      fx,
    };
  },
};

const idea: ClipSpec = {
  frames: 48,
  props: [DOT1, DOT2, BULB, RAYS],
  pose: (f) => {
    const fx: NonNullable<Pose["fx"]> = {};
    if (f >= 4 && f < 24) fx.dot1 = [0, 0];
    if (f >= 10 && f < 24) fx.dot2 = [0, 0];
    if (f >= 24) {
      fx.bulb = [0, 0];
      if ((f - 24) % 6 < 3) fx.rays = [0, 0];
    }
    const hop = f === 24 || f === 25 ? -1 : 0;
    return {
      body: [0, hop],
      legs: [0, 0, 0, 0],
      eyes: f >= 26 && f < 38 ? "happy" : blink(f, [14, 15]) ? "closed" : "open",
      eye: f < 24 ? [1, -1] : [0, 0],
      armR: f >= 26 && f < 38 ? [0, -1] : [0, 0],
      fx,
    };
  },
};

const dance: ClipSpec = {
  frames: 24,
  props: NOTE_PROPS,
  pose: (f) => {
    const b = Math.floor(f / 6) % 4;
    const A = f % 12 < 6;
    const fx: NonNullable<Pose["fx"]> = {};
    ([0, 1] as const).forEach((n) => {
      const k = (f + n * 12) % 24;
      if (k >= 2) fx[`note${n}`] = [n === 0 ? -5 : 26, R(2 - k * 0.5)];
    });
    return {
      body: [[-1, 0, 1, 0][b] ?? 0, f % 6 < 3 ? 0 : 1],
      legs: A ? [-1, 0, 0, -1] : [0, -1, -1, 0],
      armL: b % 2 === 0 ? [0, -3] : [0, 0],
      armR: b % 2 === 1 ? [0, -3] : [0, 0],
      eyes: "happy",
      fx,
    };
  },
};

const JUMP_DY = [1, 1, 1, 0, -2, -4, -5, -5, -5, -4, -2, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const celebrate: ClipSpec = {
  frames: 24,
  pose: (f) => {
    const dy = JUMP_DY[f] ?? 0;
    const air = f >= 4 && f <= 10;
    return {
      body: [0, dy],
      legs: air ? [dy - 1, dy - 1, dy - 1, dy - 1] : [0, 0, 0, 0],
      armL: air ? [-1, f >= 6 && f <= 8 ? -4 : -3] : dy > 0 ? [0, 1] : [0, 0],
      armR: air ? [1, f >= 6 && f <= 8 ? -4 : -3] : dy > 0 ? [0, 1] : [0, 0],
      eyes: f === 12 || f === 13 ? "closed" : f >= 4 && f <= 20 ? "happy" : "open",
      shadow: dy <= -4 ? 2 : dy < 0 ? 1 : 0,
    };
  },
};

const sleep: ClipSpec = {
  frames: 48,
  props: Z_PROPS,
  pose: (f) => {
    const fx: NonNullable<Pose["fx"]> = {};
    // Zs drift up from beside the head, clear of anything worn on it.
    for (let i = 0; i < 3; i++) {
      const k = (f - i * 16 + 48) % 48;
      if (k < 24) fx[`z${i}_${Math.floor(k / 8)}`] = [R(22 + k * 0.25), R(-2 - k * 0.4)];
    }
    return { body: [0, f >= 14 && f < 38 ? 1 : 0], eyes: "closed", fx };
  },
};

const coffee: ClipSpec = {
  frames: 24,
  props: [MUG, ...STEAM_PROPS],
  pose: (f) => {
    const sip = f >= 6 && f <= 16;
    const fx: NonNullable<Pose["fx"]> = { mug: [0, sip ? -2 : 0] };
    STEAM_PROPS.forEach((_, i) => {
      const k = (f + i * 8) % 24;
      if (k >= 4 && k <= 20) fx[`steam${i}`] = [i % 2 === 0 ? -1 : 1, R(-k * 0.3)];
    });
    return {
      body: [0, f % 12 >= 6 ? 1 : 0],
      armL: sip ? [2, -1] : [1, 2],
      armR: sip ? [-2, -1] : [-1, 2],
      eyes: sip ? "closed" : blink(f, [21, 22]) ? "closed" : "happy",
      fx,
    };
  },
};

const read: ClipSpec = {
  frames: 24,
  props: [BOOK],
  pose: (f) => {
    const shift = f >= 6 && f <= 16;
    return {
      body: [0, f % 12 >= 6 ? 1 : 0],
      armL: [2, 2],
      armR: [-2, 2],
      eye: shift ? [1, 0] : [-1, 0],
      eyes: blink(f, [20, 21]) ? "closed" : "open",
      fx: { book: [0, 0] },
    };
  },
};

const game: ClipSpec = {
  frames: 24,
  props: [GAMEBOY],
  pose: (f) => {
    const tap = f % 4 < 2;
    return {
      body: [0, f % 6 < 3 ? 0 : 1],
      armL: tap ? [2, 1] : [2, 2],
      armR: tap ? [-2, 2] : [-2, 1],
      eyes: "happy",
      fx: { gameboy: [0, 0] },
    };
  },
};

const meditate: ClipSpec = {
  frames: 36,
  pose: (f) => {
    const dy = R(-3 + Math.sin((f / 36) * Math.PI * 2) * 2);
    return {
      body: [0, dy],
      legs: [-2, -2, -2, -2],
      armL: [0, -1],
      armR: [0, -1],
      eyes: "closed",
      shadow: 2,
    };
  },
};

const love: ClipSpec = {
  frames: 24,
  props: [HEART_MAIN, ...MINI_HEARTS],
  pose: (f) => {
    const bob = f % 12 >= 6 ? 1 : 0;
    const fx: NonNullable<Pose["fx"]> = { heart_main: [0, bob + (f % 6 < 3 ? 0 : 1)] };
    MINI_HEARTS.forEach((_, i) => {
      const k = (f + i * 12) % 24;
      if (k >= 2) fx[`mheart${i}`] = [i === 0 ? -4 : 24, R(4 - k * 0.6)];
    });
    return {
      body: [0, bob],
      armL: [1, 0],
      armR: [-1, 0],
      eyes: "happy",
      fx,
    };
  },
};

export type MoveId =
  | "wave"
  | "idle"
  | "walk"
  | "dance"
  | "celebrate"
  | "love"
  | "idea"
  | "coffee"
  | "code"
  | "read"
  | "game"
  | "meditate"
  | "sleep";

interface MoveDef {
  id: MoveId;
  name: string;
  /** Slots the move leaves clear: its own props occupy the rest. */
  free: Slot[];
  /** The most telling frame, for thumbnails and the default paused frame. */
  still: number;
  spec: ClipSpec;
}

const ALL: Slot[] = ["head", "face", "hand"];
const NO_HAND: Slot[] = ["head", "face"];

export const MOVE_DEFS: readonly MoveDef[] = [
  { id: "wave", name: "Wave", free: ALL, still: 2, spec: wave },
  { id: "idle", name: "Idle", free: ALL, still: 0, spec: idle },
  { id: "walk", name: "Walk", free: ALL, still: 2, spec: walk },
  { id: "dance", name: "Dance", free: NO_HAND, still: 4, spec: dance },
  { id: "celebrate", name: "Cheer", free: ALL, still: 7, spec: celebrate },
  { id: "love", name: "Love", free: NO_HAND, still: 1, spec: love },
  { id: "idea", name: "Idea", free: ["face", "hand"], still: 26, spec: idea },
  { id: "coffee", name: "Coffee", free: [], still: 10, spec: coffee },
  { id: "code", name: "Code", free: ["face"], still: 20, spec: code },
  { id: "read", name: "Read", free: NO_HAND, still: 8, spec: read },
  { id: "game", name: "Game", free: NO_HAND, still: 2, spec: game },
  { id: "meditate", name: "Zen", free: ALL, still: 0, spec: meditate },
  { id: "sleep", name: "Sleep", free: ALL, still: 14, spec: sleep },
];

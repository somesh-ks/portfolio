import { art } from "../model";
import { COLORS as K } from "../palette";
import type { ItemDef, ItemPart } from "./types";

/**
 * Effects live in a lane at the upper right of the head: x 21..30, y -16..-1. Never above the
 * head, so they can't clash with a hat. They loop over the action's frame count `n`, so every
 * particle's position is a function of (f, n). `at` is absolute here (anchor "lane" adds 0).
 */

/** Progress 0..1 of particle `i` of `count` on frame `f`, staggered evenly around the loop. */
const phase = (f: number, n: number, i: number, count: number) =>
  ((f + Math.round((i * n) / count)) % n) / n;

const HEART = [".X.X.", "XXXXX", ".XXX.", "..X.."];
const NOTE = [".XX", ".X.", ".X.", "XX.", "XX."];
const WISP = [".X", "X.", ".X"];
const PLUS = [".X.", "XXX", ".X."];
const STAR = ["..X..", "..X..", "XXXXX", "..X..", "..X.."];

const hearts: ItemPart[] = [0, 1, 2].map((i) => ({
  layers: art(HEART, 0, 0, { X: i === 1 ? K.petal : K.red }),
  at: (f, n) => {
    const p = phase(f, n, i, 3);
    return p < 0.85 ? [[22, 26, 23][i]! + (Math.round(p * 6) % 2), -5 - Math.round(p * 9)] : null;
  },
}));

const notes: ItemPart[] = [0, 1].map((i) => ({
  layers: art(NOTE, 0, 0, { X: i === 0 ? K.sky : K.sand }),
  at: (f, n) => {
    const p = phase(f, n, i, 2);
    return p < 0.9 ? [[22, 26][i]! + (Math.round(p * 6) % 2), -6 - Math.round(p * 8)] : null;
  },
}));

const Z_ART = [
  ["XXXX", "..X.", ".X..", "XXXX"],
  ["XXXXX", "...X.", "..X..", ".X...", "XXXXX"],
  ["XXXXXX", "....X.", "...X..", "..X...", ".X....", "XXXXXX"],
];
const zzz: ItemPart[] = [0, 1, 2].flatMap((i) =>
  Z_ART.map((rows, s) => ({
    layers: art(rows, 0, 0, { X: K.sky }),
    at: (f: number, n: number) => {
      const p = phase(f, n, i, 3);
      return Math.min(2, Math.floor(p * 3)) === s
        ? ([22 + Math.round(p * 4), -rows.length - 1 - Math.round(p * 8)] as const)
        : null;
    },
  })),
);

const steam: ItemPart[] = [0, 1, 2].map((i) => ({
  layers: art(WISP, 0, 0, { X: "#B9B6AC" }),
  at: (f, n) => {
    const p = phase(f, n, i, 3);
    return p < 0.9 ? [23 + i * 2 + (Math.round(p * 6) % 2), -5 - Math.round(p * 9)] : null;
  },
}));

const SPARKS: Array<[cx: number, cy: number]> = [
  [25, -11],
  [29, -6],
  [22, -7],
];
const sparkles: ItemPart[] = SPARKS.flatMap(([cx, cy], i) => [
  {
    layers: art(PLUS, cx - 1, cy - 1, { X: K.gold }),
    at: (f: number, n: number) => {
      const p = phase(f, n, i, 3);
      return p < 0.2 || (p >= 0.5 && p < 0.7) ? ([0, 0] as const) : null;
    },
  },
  {
    layers: [...art(STAR, cx - 2, cy - 2, { X: K.gold }), ...art(["X"], cx, cy, { X: K.cream })],
    at: (f: number, n: number) => {
      const p = phase(f, n, i, 3);
      return p >= 0.2 && p < 0.5 ? ([0, 0] as const) : null;
    },
  },
]);

const BULB = art(
  ["..YYY..", ".YYYYY.", ".YWYYY.", ".YYYYY.", "..YYY..", "..GGG..", "...G..."],
  22,
  -13,
  { Y: K.gold, W: K.cream, G: K.steel },
);
const idea: ItemPart[] = [
  { layers: BULB },
  {
    layers: [
      ...art(["XX"], 20, -10, { X: K.gold }),
      ...art(["XX"], 29, -10, { X: K.gold }),
      ...art(["X", "X"], 25, -16, { X: K.gold }),
      ...art(["X"], 21, -14, { X: K.gold }),
      ...art(["X"], 28, -14, { X: K.gold }),
    ],
    at: (f, n) => (Math.floor((f * 8) / n) % 2 === 0 ? [0, 0] : null),
  },
];

export const EFFECT: ItemDef[] = [
  { id: "hearts", name: "Hearts", slot: "effect", anchor: "lane", parts: hearts },
  { id: "notes", name: "Music notes", slot: "effect", anchor: "lane", parts: notes },
  { id: "idea", name: "Idea", slot: "effect", anchor: "lane", parts: idea },
  { id: "zzz", name: "Zzz", slot: "effect", anchor: "lane", parts: zzz },
  { id: "steam", name: "Steam", slot: "effect", anchor: "lane", parts: steam },
  { id: "sparkles", name: "Sparkles", slot: "effect", anchor: "lane", parts: sparkles },
];

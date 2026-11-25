import { art, type Layer } from "../model";
import { COLORS as K } from "../palette";
import type { ItemDef, ItemPart } from "./types";

/**
 * Effects live in a lane at the upper right of the head: x 21..31, y -18..-1, never above the
 * head, so they can't clash with a hat. A sticker is ONE die-cut piece, so every particle must sit
 * within two cells of the head's top-right corner or of the particle before it: the outline's
 * closing step bridges that and nothing farther. Effects are therefore a chain that builds up
 * from the corner: particle 0 is always there, particle k shows once the loop is k/count through.
 * Positions are a function of (f, n); `at` is absolute here and the lane follows the body.
 */

/** Particles in chain order. `shapes` are the looks one particle cycles through. */
interface Particle {
  shapes: Layer[][];
}

/** How many particles of `count` show on frame `f` of `n`: 1, then 2, then all. */
const shown = (f: number, n: number, count: number) => 1 + Math.floor((count * (f % n)) / n);

function chain(ps: Particle[], twinkle = false): ItemPart[] {
  return ps.flatMap((p, i) =>
    p.shapes.map((layers, s) => ({
      layers,
      at: (f: number, n: number) => {
        if (i >= shown(f, n, ps.length)) return null;
        // Bob up one cell on alternating quarters; twinkling particles swap shape instead.
        const q = Math.floor((f * 4) / n) + i;
        if (twinkle) return q % p.shapes.length === s ? ([0, 0] as const) : null;
        return [0, -(q % 2)] as const;
      },
    })),
  );
}

const one = (rows: string[], x: number, y: number, c: string): Layer[] => art(rows, x, y, { X: c });

const HEART = [".X.X.", "XXXXX", ".XXX.", "..X.."];
const NOTE = [".XX", ".X.", ".X.", "XX.", "XX."];
const WISP = [".XX", "XX.", ".XX"];
const PLUS = [".X.", "XXX", ".X."];
const STAR = ["..X..", "..X..", "XXXXX", "..X..", "..X.."];
const Z_ART = [
  ["XXXX", "..X.", ".X..", "XXXX"],
  ["XXXXX", "...X.", "..X..", ".X...", "XXXXX"],
  ["XXXXXX", "....X.", "...X..", "..X...", ".X....", "XXXXXX"],
];

const hearts = chain([
  { shapes: [one(HEART, 21, -5, K.red)] },
  { shapes: [one(HEART, 26, -9, K.petal)] },
  { shapes: [one(HEART, 21, -13, K.red)] },
]);

const notes = chain([
  { shapes: [one(NOTE, 21, -6, K.sky)] },
  { shapes: [one(NOTE, 25, -10, K.sand)] },
]);

const zzz = chain([
  { shapes: [one(Z_ART[0]!, 21, -5, K.sky)] },
  { shapes: [one(Z_ART[1]!, 25, -11, K.sky)] },
  { shapes: [one(Z_ART[2]!, 22, -18, K.sky)] },
]);

// Two wavy columns of wisps that climb and thin out: the higher, the fainter. The wisps flip
// between two S shapes so each column wobbles, and every one sits within two cells of the last.
const WISP_B = ["XX.", ".XX", "XX."];
const wisp = (rows: string[], x: number, y: number, alpha: number): Layer[] =>
  art(rows, x, y, { X: K.warmGrey }, alpha);
const steam = chain([
  { shapes: [wisp(WISP, 21, -4, 0.9)] },
  { shapes: [wisp(WISP_B, 25, -5, 0.85)] },
  { shapes: [wisp(WISP_B, 21, -8, 0.7)] },
  { shapes: [wisp(WISP, 25, -9, 0.65)] },
  { shapes: [wisp(WISP, 22, -12, 0.5)] },
]);

const spark = (cx: number, cy: number): Layer[][] => [
  one(PLUS, cx - 1, cy - 1, K.gold),
  [...one(STAR, cx - 2, cy - 2, K.gold), ...one(["X"], cx, cy, K.cream)],
];
const sparkles = chain(
  [{ shapes: spark(22, -4) }, { shapes: spark(25, -7) }, { shapes: spark(24, -11) }],
  true,
);

const BULB = art(
  ["..YYY..", ".YYYYY.", ".YWYYY.", ".YYYYY.", "..YYY..", "..GGG..", "...G..."],
  21,
  -7,
  { Y: K.gold, W: K.cream, G: K.steel },
);
const idea: ItemPart[] = [
  { layers: BULB },
  {
    layers: [
      ...art(["XX"], 29, -4, { X: K.gold }),
      ...art(["X", "X"], 24, -10, { X: K.gold }),
      ...art(["X"], 28, -9, { X: K.gold }),
      ...art(["X"], 21, -9, { X: K.gold }),
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

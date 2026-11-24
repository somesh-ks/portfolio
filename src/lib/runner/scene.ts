/**
 * Weather dressing for the runner: sun, moon, stars, falling particles and
 * weather versions of the desk obstacles. Pure data and arithmetic; the
 * renderer draws it. Reskins keep each obstacle's size, so hitboxes and the
 * leaderboard are the same in every weather.
 */
import { art, type ObstacleKind, type ObstacleSprite, type Cell, type Tone } from "./sprites";
import type { Sky, Weather } from "./weather";

export const DEFAULT_WEATHER: Weather = { sky: "cloudy", night: false, temp: null };

export const SUN: Cell[] = art(
  [".GGGGG.", "GGGGGGG", "GGGGGGG", "GGGGGGG", "GGGGGGG", "GGGGGGG", ".GGGGG."],
  0,
  0,
  { G: "gold" },
);
export const MOON: Cell[] = art(
  ["..SSSS", ".SSS..", "SSS...", "SSS...", "SSS...", ".SSS..", "..SSSS"],
  0,
  0,
  { S: "sand" },
);
/** Star spots across the 200-cell sky strip: [x, y]. */
export const STARS: readonly (readonly [number, number])[] = [
  [6, 6],
  [31, 14],
  [52, 3],
  [70, 20],
  [97, 9],
  [118, 2],
  [141, 16],
  [163, 5],
  [187, 12],
];

/** How many of the four clouds show. A clear sky keeps two. */
export function cloudCount(sky: Sky): number {
  return sky === "clear" ? 2 : 4;
}

const sprite = (rows: string[], tones: Record<string, Tone>): ObstacleSprite => ({
  w: rows[0]?.length ?? 0,
  h: rows.length,
  cells: art(rows, 0, 0, tones),
});

/** Weather stand-ins, each the size of the desk obstacle it replaces. */
export const RESKINS: Partial<Record<Sky, Partial<Record<ObstacleKind, ObstacleSprite>>>> = {
  snow: {
    plant: sprite(
      [
        "...TTT...",
        "..TCCCT..",
        "..CKCKC..",
        "..CCGCC..",
        "...CCC...",
        ".BBBBBBB.",
        "..CCCCC..",
        ".CCCKCCC.",
        "TCCCCCCCT",
        "TCCCKCCCT",
        ".CCCCCCC.",
        "..TTTTT..",
      ],
      { T: "steel", C: "cream", K: "ink", G: "gold", B: "body" },
    ),
  },
  rain: {
    mug: sprite(
      [
        "..KKKK...",
        "..KKKK...",
        "..KSSK...",
        "..KKKK...",
        "..KKKK...",
        "..KKKKKK.",
        "..KKKKKKK",
        "..KKKKKKK",
        "SSSSSSSSS",
      ],
      { K: "gold", S: "sky" },
    ),
  },
  clear: {
    plant: sprite(
      [
        "....M....",
        "...MMM...",
        "...MMM...",
        "M..MMM...",
        "M..MMM..M",
        "MM.MMM..M",
        ".MMMMM.MM",
        "...MMMMM.",
        "...MMM...",
        "..SSSSS..",
        "..SSSSS..",
        "..SSSSS..",
      ],
      { M: "moss", S: "sand" },
    ),
  },
  fog: {
    rack: sprite(
      [
        "....B....",
        "...BBB...",
        "...BBB...",
        "...CCC...",
        "..CCCCC..",
        "..BBBBB..",
        "..BBBBB..",
        ".BBBBBBB.",
        ".CCCCCCC.",
        ".CCCCCCC.",
        "BBBBBBBBB",
        "SSSSSSSSS",
        "SSSSSSSSS",
      ],
      { B: "body", C: "cream", S: "steel" },
    ),
  },
};

export interface Particle {
  x: number;
  y: number;
}

/** Rain streaks and snowflakes over a 200-cell strip of sky. */
const PARTICLE_COUNT = 40;
const PARTICLE_STRIP = 200;

export function makeParticles(): Particle[] {
  // A fixed scatter, so the reduced-motion frame is the same every visit.
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const hash = Math.imul(index + 1, 2654435761) >>> 0;
    return { x: hash % PARTICLE_STRIP, y: (hash >>> 8) % 56 };
  });
}

/** Cells per second: [fall, drift left]. */
export function particleSpeed(sky: Sky): readonly [number, number] | null {
  if (sky === "rain") return [60, 6];
  if (sky === "snow") return [10, 4];
  return null;
}

/** Moves particles by `dt` seconds of fall and drift. */
export function stepParticles(particles: Particle[], sky: Sky, dt: number, ground: number) {
  const speed = particleSpeed(sky);
  if (!speed) return;
  for (const particle of particles) {
    particle.y += speed[0] * dt;
    particle.x -= speed[1] * dt;
    if (particle.y >= ground) particle.y -= ground;
    particle.x = ((particle.x % PARTICLE_STRIP) + PARTICLE_STRIP) % PARTICLE_STRIP;
  }
}

/** x, y, w, h, colour: a ride frame as the renderer draws it. */
type Rect = readonly [number, number, number, number, string];

/** Where a frame's face is, found from its pixels so every ride and frame
 * (bobbing, kite flutter) gets its own spot without hand-placed anchors. */
export interface Face {
  /** Eyes, as [x, y] of each 2x2 block's top-left. */
  eyes: (readonly [number, number])[];
  /** Top row of the head, and its span on that row. */
  top: number;
  left: number;
  right: number;
}

function rgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
const isDark = (hex: string) => rgb(hex).every((channel) => channel < 40);
const isClay = (hex: string) => {
  const [r, g, b] = rgb(hex);
  return r > 150 && r > g + 30 && g > b;
};

export function findFace(rects: readonly Rect[]): Face | null {
  const pixels = new Map<string, string>();
  for (const [x, y, w, h, colour] of rects)
    for (let dy = 0; dy < h; dy += 1)
      for (let dx = 0; dx < w; dx += 1) pixels.set(`${x + dx},${y + dy}`, colour);
  const at = (x: number, y: number) => pixels.get(`${x},${y}`);
  const dark = (x: number, y: number) => {
    const colour = at(x, y);
    return colour !== undefined && isDark(colour);
  };
  const clay = (x: number, y: number) => {
    const colour = at(x, y);
    return colour !== undefined && isClay(colour);
  };

  // An eye: a 2x2 dark block set in clay on the left or right.
  const eyes: [number, number][] = [];
  for (const key of pixels.keys()) {
    const [x = 0, y = 0] = key.split(",").map(Number);
    if (!(dark(x, y) && dark(x + 1, y) && dark(x, y + 1) && dark(x + 1, y + 1))) continue;
    if (dark(x - 1, y) || dark(x, y - 1)) continue;
    if (clay(x - 1, y) || clay(x + 2, y)) eyes.push([x, y]);
  }
  if (!eyes.length) return null;
  eyes.sort((a, b) => a[0] - b[0]);

  // Up from each eye through solid pixels: the highest point is the crown.
  let top = Infinity;
  let column = eyes[0]![0];
  for (const [ex, ey] of eyes)
    for (const x of [ex, ex + 1]) {
      let y = ey;
      while (at(x, y - 1) !== undefined) y -= 1;
      if (y < top) [top, column] = [y, x];
    }
  const span = (y: number) => {
    let left = column;
    let right = column;
    while (at(left - 1, y) !== undefined) left -= 1;
    while (at(right + 1, y) !== undefined) right += 1;
    return [left, right] as const;
  };
  // A bump on the crown (the kite rider's) is no place for a hat: step down
  // to the first row as wide as a head.
  let [left, right] = span(top);
  while (right - left < 9 && top < eyes[0]![1] - 1) [left, right] = span((top += 1));
  return { eyes, top, left, right };
}

export type Accessory = "umbrella" | "beanie" | "nightcap" | "shades";

/** What Claude wears: an umbrella in rain, a beanie in snow, shades in the
 * sun, a nightcap on a dry night. Cloud and fog need nothing. */
export function accessoryFor(weather: Weather): Accessory | null {
  if (weather.sky === "rain") return "umbrella";
  if (weather.sky === "snow") return "beanie";
  if (weather.night) return "nightcap";
  if (weather.sky === "clear") return "shades";
  return null;
}

/** Rides whose head is under a helmet or a roof keep their hats off. */
const HATLESS = new Set(["bike", "car"]);
const UMBRELLALESS = new Set(["car"]);

/** The accessory as cells, in the same frame as the ride's rects. */
export function dress(face: Face, accessory: Accessory, costume: string): Cell[] {
  const { top, left, right, eyes } = face;
  const width = right - left + 1;
  const middle = Math.floor((left + right) / 2);
  if (accessory === "shades") {
    const cells: Cell[] = [];
    for (const [x, y] of eyes) {
      cells.push([x - 1, y, 4, 2, "ink"], [x - 1, y, 1, 1, "cream"]);
    }
    const first = eyes[0];
    const last = eyes.at(-1);
    if (first && last && last[0] > first[0])
      cells.push([first[0] + 3, first[1], last[0] - first[0] - 3, 1, "ink"]);
    return cells;
  }
  if (accessory === "umbrella") {
    if (UMBRELLALESS.has(costume)) return [];
    const span = 17;
    const x0 = middle - 8;
    const canopy = top - 7;
    return [
      [x0 + 6, canopy, 5, 1, "gold"],
      [x0 + 3, canopy + 1, 11, 1, "gold"],
      [x0 + 1, canopy + 2, 15, 1, "gold"],
      [x0, canopy + 3, span, 1, "gold"],
      // Scalloped edge, then the shaft down to the head.
      [x0, canopy + 4, 2, 1, "gold"],
      [x0 + 5, canopy + 4, 2, 1, "gold"],
      [x0 + 10, canopy + 4, 2, 1, "gold"],
      [x0 + 15, canopy + 4, 2, 1, "gold"],
      [middle, canopy - 1, 1, 1, "steel"],
      [middle, canopy + 4, 1, 3, "steel"],
    ];
  }
  if (HATLESS.has(costume)) return [];
  if (accessory === "beanie") {
    return [
      [middle - 1, top - 6, 3, 2, "gold"],
      [left + 3, top - 4, width - 6, 1, "sky"],
      [left + 1, top - 3, width - 2, 1, "sky"],
      [left, top - 2, width, 1, "sky"],
      [left, top - 1, width, 1, "gold"],
    ];
  }
  // A nightcap flops back over the head's left side, pom at the tip.
  return [
    [left, top - 1, width, 1, "sky"],
    [left + 1, top - 2, width - 2, 1, "sky"],
    [left + 3, top - 3, width - 7, 1, "sky"],
    [left + 2, top - 4, Math.max(width - 11, 4), 1, "sky"],
    [left, top - 5, 4, 1, "sky"],
    [left - 1, top - 4, 2, 1, "sky"],
    [left - 3, top - 4, 2, 2, "gold"],
  ];
}

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

interface Particle {
  x: number;
  y: number;
  /** Rain only: 0 is a far, short, slower drop; 1 a near, longer one. */
  near: 0 | 1;
  /** Seconds since this drop last hit the ground, for its splash. */
  splash: number;
  splashX: number;
}

/** Rain streaks and snowflakes over a 200-cell strip of sky. */
const PARTICLE_COUNT = 40;
const PARTICLE_STRIP = 200;

export function makeParticles(): Particle[] {
  // A fixed scatter, so the reduced-motion frame is the same every visit.
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const hash = Math.imul(index + 1, 2654435761) >>> 0;
    const near = ((hash >>> 4) & 1) as 0 | 1;
    return { x: hash % PARTICLE_STRIP, y: (hash >>> 8) % 56, near, splash: SPLASH, splashX: 0 };
  });
}

/** How long a splash shows, in seconds. */
export const SPLASH = 0.12;

/** Cells per second: [fall, drift left]. Rain slants about one across for
 * three down, the angle its drops are drawn at. */
export function particleSpeed(sky: Sky): readonly [number, number] | null {
  if (sky === "rain") return [54, 18];
  if (sky === "snow") return [10, 4];
  return null;
}

/** Moves particles by `dt` seconds of fall and drift. */
export function stepParticles(particles: Particle[], sky: Sky, dt: number, ground: number) {
  const speed = particleSpeed(sky);
  if (!speed) return;
  for (const particle of particles) {
    // Far drops fall a little slower, so the rain has depth.
    const pace = sky === "rain" && !particle.near ? 0.8 : 1;
    particle.y += speed[0] * dt * pace;
    particle.x -= speed[1] * dt * pace;
    particle.splash += dt;
    if (particle.y >= ground) {
      particle.y -= ground;
      particle.splash = 0;
      particle.splashX = particle.x;
    }
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
  // Eyes sit within a row or two of the top-most one; lower dark blocks are wheels or trim.
  const row = Math.min(...eyes.map(([, y]) => y));
  eyes.splice(0, eyes.length, ...eyes.filter(([, y]) => y - row <= 2));
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

export type Accessory = "umbrella" | "beanie" | "nightcap";

/** What Claude wears: an umbrella in rain, a beanie in snow, a nightcap on a
 * dry night. Clear days, cloud and fog need nothing. */
export function accessoryFor(weather: Weather): Accessory | null {
  if (weather.sky === "rain") return "umbrella";
  if (weather.sky === "snow") return "beanie";
  if (weather.night) return "nightcap";
  return null;
}

/** Rides whose head is under a helmet or a roof keep their hats off. */
const HATLESS = new Set(["bike", "car"]);
const UMBRELLALESS = new Set(["car"]);

/** How the soft parts of a hat (the pom, the nightcap's tail) sit: a
 * damped spring driven by the head's acceleration. Positive sags toward the
 * head, negative lifts. A hat's band never moves: it is pulled onto the head,
 * so only what hangs loose answers to a jump. */
export interface Sway {
  offset: number;
  speed: number;
}

const SWAY_FREQUENCY = 18;
const SWAY_DAMPING = 0.55;

/** Advances the sway by one step, given the head's vertical velocity before
 * and after it (cells per second, up is positive) and gravity. On the ground
 * the felt gravity is 1g and the pom rests; in free fall it is 0g, so loose
 * cloth floats up a cell; take-off and landing are hard pushes that sag it. */
export function stepSway(sway: Sway, before: number, after: number, dt: number, gravity: number) {
  const felt = 1 + (after - before) / dt / gravity;
  const pull = Math.max(-1, Math.min(24, felt - 1));
  const stiffness = SWAY_FREQUENCY ** 2;
  const accel =
    stiffness * pull - stiffness * sway.offset - 2 * SWAY_DAMPING * SWAY_FREQUENCY * sway.speed;
  sway.speed += accel * dt;
  sway.offset += sway.speed * dt;
  if (Math.abs(sway.offset) > 1) {
    sway.offset = Math.sign(sway.offset);
    sway.speed = 0;
  }
}

/** The sway as a whole row: -1 lifted, 0 at rest, 1 sagging. */
export function swayRow(sway: Sway): -1 | 0 | 1 {
  return sway.offset > 0.5 ? 1 : sway.offset < -0.5 ? -1 : 0;
}

/** The accessory as cells, in the same frame as the ride's rects. */
export function dress(
  face: Face,
  accessory: Accessory,
  costume: string,
  sway: -1 | 0 | 1 = 0,
  /** Rows between the head and the top of the canvas. */
  headroom = Infinity,
): Cell[] {
  const { left, right, top } = face;
  const width = right - left + 1;
  const middle = Math.floor((left + right) / 2);
  if (accessory === "umbrella") {
    if (UMBRELLALESS.has(costume)) return [];
    const span = 17;
    const x0 = middle - 8;
    // The umbrella is rigid: the shaft only shortens (Claude holds it lower)
    // when a jump would push the canopy off the top of the canvas.
    const shaft = Math.max(1, Math.min(3, headroom - 6));
    const canopy = top - shaft - 4;
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
      [middle, canopy + 4, 1, shaft, "steel"],
    ];
  }
  if (HATLESS.has(costume)) return [];
  if (accessory === "beanie") {
    // The pom squashes wide on a sag and stretches tall when it floats; it
    // stays sewn on either way.
    const pom: Cell =
      sway === 1
        ? [middle - 2, top - 5, 5, 1, "gold"]
        : sway === -1
          ? [middle - 1, top - 7, 3, 3, "gold"]
          : [middle - 1, top - 6, 3, 2, "gold"];
    return [
      pom,
      [left + 3, top - 4, width - 6, 1, "sky"],
      [left + 1, top - 3, width - 2, 1, "sky"],
      [left, top - 2, width, 1, "sky"],
      [left, top - 1, width, 1, "gold"],
    ];
  }
  // A nightcap flops back over the head's left side, pom at the tip. The
  // tail sags a row on a hard push and lifts a row in free fall.
  const tail = top + sway;
  const cells: Cell[] = [
    [left, top - 1, width, 1, "sky"],
    [left + 1, top - 2, width - 2, 1, "sky"],
    [left + 3, top - 3, width - 7, 1, "sky"],
    [left + 2, top - 4, Math.max(width - 11, 4), 1, "sky"],
    [left, tail - 5, 4, 1, "sky"],
    [left - 1, tail - 4, 2, 1, "sky"],
    [left - 3, tail - 4, 2, 2, "gold"],
  ];
  // Lifted, a stitch joins the raised tip back to the cap.
  if (sway === -1) cells.push([left + 2, top - 5, 2, 1, "sky"]);
  return cells;
}

/** Faint horizon scenery, one colour: palms, pines, a house, low hills. */
const tree = (rows: string[]) => art(rows, 0, 0, { X: "line" });

const PALM = tree([
  "....XXX.XXX....",
  "..XXXXXXXXXXX..",
  ".XX...XXX...XX.",
  "X....XXXXX....X",
  "....X.XX.X.....",
  "...X...XX..X...",
  ".......XX......",
  "......XX.......",
  "......XX.......",
  "......XX.......",
  ".......XX......",
  ".......XX......",
  ".......XX......",
  "......XXXX.....",
]);
const PINE = tree([
  ".....X.....",
  "....XXX....",
  "...XXXXX...",
  "....XXX....",
  "...XXXXX...",
  "..XXXXXXX..",
  "....XXX....",
  "..XXXXXXX..",
  ".XXXXXXXXX.",
  "...XXXXX...",
  ".XXXXXXXXX.",
  "XXXXXXXXXXX",
  ".....X.....",
  ".....X.....",
]);
const HUT = tree(["...X...", "..XXX..", ".XXXXX.", "XXXXXXX", ".X.X.X.", ".XXXXX."]);

export const SCENERY_STRIP = 320;

/** A hill's height at x along the strip: two soft humps, flat between. */
export function hillHeight(x: number): number {
  const at = (centre: number, width: number, height: number) => {
    const d = Math.abs(x - centre) / width;
    return d >= 1 ? 0 : Math.round(height * (1 - d * d));
  };
  return Math.max(at(75, 70, 6), at(260, 60, 5));
}

/** Items along the strip: [x, sprite], standing on the hills. Snow swaps
 * palms for pines. */
export function scenery(sky: Sky): (readonly [number, Cell[], number])[] {
  // At rest the first ~45 cells (Claude's spot) stay clear of trees.
  const plant = sky === "snow" ? PINE : PALM;
  const items: (readonly [number, Cell[]])[] = [
    [66, plant],
    [90, plant],
    [140, HUT],
    [214, plant],
    [262, plant],
    [284, plant],
  ];
  return items.map(([x, cells]) => {
    const height = Math.max(...cells.map(([, y]) => y)) + 1;
    return [x, cells, height] as const;
  });
}

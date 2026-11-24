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

/**
 * The official claude.dev Claude sprites, as palette-indexed frames with
 * per-frame deltas (the format the site ships). Decoded once into rect lists.
 * `walk` is small and bundled for the hero's static frame; the rides are
 * fetched from /runner/rides.json with the engine, outside the JS budget.
 */
import walk from "./sprites/walk.json";

export interface RawSprite {
  w: number;
  h: number;
  fps: number;
  palette: string[];
  /** One char per pixel: palette index, or "." for empty. */
  base: string;
  /** Per frame: comma-separated `<base36 pixel index><palette index | .>`. */
  deltas: string[];
}

/** x, y, w, h, colour */
type SpriteRect = readonly [number, number, number, number, string];

export interface Sprite {
  fps: number;
  /** The riding loop, frame indices [start, end). */
  frames: SpriteRect[][];
  /** Standing frame, used before the run starts. */
  idle: SpriteRect[];
  /** Visible width, and the collision box measured from the left edge. */
  width: number;
  hitbox: { x: number; w: number };
}

export const COSTUMES = ["walk", "skate", "scooter", "bike", "kite", "car"] as const;
export type Costume = (typeof COSTUMES)[number];

export const COSTUME_NAMES: Record<Costume, string> = {
  walk: "Classic",
  skate: "Skateboard",
  scooter: "Scooter",
  bike: "Bike",
  kite: "Kite",
  car: "Car",
};

/** Where each sprite's steady riding loop sits inside its full animation. */
const LOOPS: Record<Costume, readonly [number, number]> = {
  walk: [5, 10],
  skate: [31, 33],
  scooter: [26, 28],
  bike: [12, 20],
  kite: [33, 35],
  car: [13, 29],
};

/** The front of the body collides; a long car's tail is forgiven. */
const MAX_HIT_WIDTH = 20;

function decodePixels(raw: RawSprite): Uint8Array[] {
  const current = Uint8Array.from(raw.base, (ch) => (ch === "." ? 255 : Number(ch)));
  const frames = [current.slice()];
  for (const delta of raw.deltas) {
    for (const token of delta ? delta.split(",") : []) {
      if (!token) continue;
      const value = token.at(-1);
      current[parseInt(token.slice(0, -1), 36)] = value === "." ? 255 : Number(value);
    }
    frames.push(current.slice());
  }
  return frames;
}

interface Bounds {
  left: number;
  right: number;
  bottom: number;
}

function bounds(raw: RawSprite, frames: Uint8Array[]): Bounds {
  let left = raw.w;
  let right = -1;
  let bottom = -1;
  for (const pixels of frames)
    pixels.forEach((value, index) => {
      if (value === 255) return;
      const x = index % raw.w;
      const y = Math.floor(index / raw.w);
      left = Math.min(left, x);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    });
  return { left, right, bottom };
}

/** Rows of same-colour runs, shifted so the sprite's left edge is x = 0 and
 * its lowest pixel sits on y = 0 (drawn upward from the ground). */
function toRects(raw: RawSprite, pixels: Uint8Array, box: Bounds): SpriteRect[] {
  const out: SpriteRect[] = [];
  for (let y = 0; y < raw.h; y += 1) {
    let x = 0;
    while (x < raw.w) {
      const value = pixels[y * raw.w + x] ?? 255;
      if (value === 255) {
        x += 1;
        continue;
      }
      let end = x;
      while (end < raw.w && pixels[y * raw.w + end] === value) end += 1;
      out.push([x - box.left, y - box.bottom - 1, end - x, 1, raw.palette[value] ?? "#000"]);
      x = end;
    }
  }
  return out;
}

export function buildSprite(raw: RawSprite, costume: Costume): Sprite {
  const all = decodePixels(raw);
  const [start, end] = LOOPS[costume];
  const loop = all.slice(start, end);
  const box = bounds(raw, [...loop, all[0] ?? new Uint8Array()]);
  const width = box.right - box.left + 1;
  const hit = Math.min(width, MAX_HIT_WIDTH);
  return {
    fps: raw.fps,
    frames: loop.map((pixels) => toRects(raw, pixels, box)),
    idle: toRects(raw, all[0] ?? new Uint8Array(), box),
    width,
    hitbox: { x: width - hit + 2, w: hit - 4 },
  };
}

/** The walking Claude, for the server-rendered frame. */
export function walkLoop(): Sprite {
  return buildSprite(walk as RawSprite, "walk");
}

export const walkSprite = walk as RawSprite;

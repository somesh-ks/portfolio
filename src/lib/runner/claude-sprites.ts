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
  // The kite's full flutter; the legs come from the walk (see walkingLegs).
  kite: [52, 83],
  car: [13, 29],
};

/** Rides drawn smaller than their source art: the car is twice the others'
 * length, so it rides at two thirds. */
const SCALE: Partial<Record<Costume, number>> = { car: 2 / 3 };

/** Box resample of every frame: each output pixel takes the most common
 * colour under it (empty loses ties), and a dark eye pixel always survives,
 * so faces, wheels and stripes stay readable instead of breaking up. */
function scaleFrames(raw: RawSprite, frames: Uint8Array[], scale: number) {
  const w = Math.round(raw.w * scale);
  const h = Math.round(raw.h * scale);
  const darkest = raw.palette.findIndex((hex) => hex.toLowerCase() === "#141413");
  const scaled = frames.map((pixels) => {
    const out = new Uint8Array(w * h).fill(255);
    for (let y = 0; y < h; y += 1)
      for (let x = 0; x < w; x += 1) {
        const counts = new Map<number, number>();
        const x0 = Math.floor(x / scale);
        const x1 = Math.max(x0 + 1, Math.ceil((x + 1) / scale));
        const y0 = Math.floor(y / scale);
        const y1 = Math.max(y0 + 1, Math.ceil((y + 1) / scale));
        for (let sy = y0; sy < Math.min(y1, raw.h); sy += 1)
          for (let sx = x0; sx < Math.min(x1, raw.w); sx += 1) {
            const value = pixels[sy * raw.w + sx] ?? 255;
            counts.set(value, (counts.get(value) ?? 0) + (value === 255 ? 0.9 : 1));
          }
        let best = 255;
        let most = 0;
        for (const [value, count] of counts) if (count > most) [best, most] = [value, count];
        if (darkest >= 0 && counts.has(darkest) && best !== 255) best = darkest;
        out[y * w + x] = best;
      }
    return out;
  });
  return { raw: { ...raw, w, h }, frames: scaled };
}

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
  /** Right edge of what touches the ground: a kite overhead doesn't collide. */
  footRight: number;
}

/** Rows above the lowest pixel that count as "at ground level" for collisions. */
const FOOT_ROWS = 7;

/** `frames` set the drawing box; `riding` (the loop) sets the collision front,
 * so a kite lying on the ground in the standing frame doesn't count. */
function bounds(raw: RawSprite, frames: Uint8Array[], riding: Uint8Array[]): Bounds {
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
  let footRight = left;
  for (const pixels of riding)
    pixels.forEach((value, index) => {
      if (value !== 255 && Math.floor(index / raw.w) > bottom - FOOT_ROWS)
        footRight = Math.max(footRight, index % raw.w);
    });
  return { left, right, bottom, footRight };
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

/** The kite sprite flies its kite standing still. Give it the walk cycle's
 * legs: its bottom five rows line up with the walk's leg rows, same columns. */
const KITE_LEG_TOP = 28;
const WALK_LEG_TOP = 13;
const LEG_ROWS = 5;

function walkingLegs(raw: RawSprite, frames: Uint8Array[]): Uint8Array[] {
  const legsRaw = walk as RawSprite;
  const walkFrames = decodePixels(legsRaw);
  const [start, end] = LOOPS.walk;
  const steps = walkFrames.slice(start, end);
  // Walk palette index -> kite palette index, matched by colour.
  // A colour the kite lacks draws nothing rather than a wrong colour.
  const kite = raw.palette.map((hex) => hex.toLowerCase());
  const colour = legsRaw.palette.map((hex) => kite.indexOf(hex.toLowerCase()));
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const length = (frames.length * steps.length) / gcd(frames.length, steps.length);
  return Array.from({ length }, (_, i) => {
    const pixels = (frames[i % frames.length] ?? new Uint8Array()).slice();
    const legs = steps[i % steps.length] ?? new Uint8Array();
    for (let row = 0; row < LEG_ROWS; row += 1)
      for (let x = 0; x < legsRaw.w; x += 1) {
        const value = legs[(WALK_LEG_TOP + row) * legsRaw.w + x] ?? 255;
        pixels[(KITE_LEG_TOP + row) * raw.w + x] =
          value === 255 || (colour[value] ?? -1) < 0 ? 255 : colour[value]!;
      }
    return pixels;
  });
}

export function buildSprite(source: RawSprite, costume: Costume): Sprite {
  const scale = SCALE[costume];
  const decoded = decodePixels(source);
  const { raw, frames: all } = scale
    ? scaleFrames(source, decoded, scale)
    : { raw: source, frames: decoded };
  const [start, end] = LOOPS[costume];
  const flown = all.slice(start, end);
  const loop = costume === "kite" ? walkingLegs(raw, flown) : flown;
  const box = bounds(raw, [...loop, all[0] ?? new Uint8Array()], loop);
  const width = box.right - box.left + 1;
  // The kite flies ahead of Claude; only its feet can hit. Other rides hit
  // with their full front, body included, since tall obstacles reach it.
  const front = (costume === "kite" ? box.footRight : box.right) - box.left + 1;
  const hit = Math.min(front, MAX_HIT_WIDTH);
  return {
    fps: raw.fps,
    frames: loop.map((pixels) => toRects(raw, pixels, box)),
    idle: toRects(raw, all[0] ?? new Uint8Array(), box),
    width,
    hitbox: { x: front - hit + 2, w: hit - 4 },
  };
}

/** The walking Claude, for the server-rendered frame. */
export function walkLoop(): Sprite {
  return buildSprite(walk as RawSprite, "walk");
}

export const walkSprite = walk as RawSprite;

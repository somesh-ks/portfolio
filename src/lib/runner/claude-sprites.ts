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
  /** World cells per art pixel, when the art is drawn smaller than 1:1. */
  cell?: number;
  /** The same frames smoothed to twice the pixels, for screens with room. */
  fine?: Sprite;
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

/** The car's art is twice the others' length, so it rides at two thirds of
 * a cell per art pixel. Shrinking it by dropping pixels broke the wheels and
 * face into noise; every pixel is kept instead, and the engine rounds edges
 * to device pixels. */
const CELL: Partial<Record<Costume, number>> = { car: 2 / 3 };
/** Rides that also get a smoothed copy (see `Sprite.fine`). */
const SMOOTHED = new Set<Costume>(["car"]);

/** Scale2x (EPX): doubles pixel art, rounding stair-steps into diagonals
 * without inventing colours, so the design stays the same. */
function scale2x(raw: RawSprite, frames: Uint8Array[]) {
  const { w, h } = raw;
  const scaled = frames.map((pixels) => {
    const out = new Uint8Array(w * h * 4);
    const at = (x: number, y: number, fallback: number) =>
      x < 0 || y < 0 || x >= w || y >= h ? fallback : (pixels[y * w + x] ?? 255);
    for (let y = 0; y < h; y += 1)
      for (let x = 0; x < w; x += 1) {
        const p = pixels[y * w + x] ?? 255;
        const a = at(x, y - 1, p);
        const b = at(x + 1, y, p);
        const c = at(x - 1, y, p);
        const d = at(x, y + 1, p);
        const row = 2 * y * 2 * w;
        out[row + 2 * x] = c === a && c !== d && a !== b ? a : p;
        out[row + 2 * x + 1] = a === b && a !== c && b !== d ? b : p;
        out[row + 2 * w + 2 * x] = d === c && d !== b && c !== a ? c : p;
        out[row + 2 * w + 2 * x + 1] = b === d && b !== a && d !== c ? d : p;
      }
    return out;
  });
  return { raw: { ...raw, w: w * 2, h: h * 2 }, frames: scaled };
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

/** Rides whose turned face puts the far eye on the face's edge (walk,
 * scooter) or a row low and half hidden (bike). */
const LEVEL_EYES = new Set<Costume>(["walk", "scooter", "bike"]);
/** Left eye to right eye, in pixels, as on the skateboard's face. */
const EYE_SPACING = 8;

/**
 * Sets the far eye level with the near one, two pixels wide, `EYE_SPACING`
 * along and at least one pixel in from the face's edge, as the skateboard
 * draws it. The near eye is the leftmost dark pixel with body colour on its
 * left and a dark pixel below; the far eye is any dark pixel just right of it, painted over with
 * body colour first.
 */
export function levelEyes(raw: RawSprite, pixels: Uint8Array): Uint8Array {
  const out = pixels.slice();
  const { w, h } = raw;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 255 : out[y * w + x]!);
  const counts = new Map<number, number>();
  for (const value of out) if (value !== 255) counts.set(value, (counts.get(value) ?? 0) + 1);
  const body = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  const luma = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  };
  const dark = (value: number) => value !== 255 && luma(raw.palette[value] ?? "#fff") < 64;
  if (body === undefined) return out;
  // The near eye is the leftmost such pixel: the far one can sit a row higher.
  let near: [number, number] | null = null;
  for (let y = 0; y < h - 1; y += 1)
    for (let x = 1; x < w; x += 1)
      if (dark(at(x, y)) && at(x - 1, y) === body && dark(at(x, y + 1)) && (!near || x < near[0]))
        near = [x, y];
  if (!near) return out;
  const [x, y] = near;
  for (let fy = y - 1; fy <= y + 2; fy += 1)
    for (let fx = x + 3; fx < x + 14; fx += 1) if (dark(at(fx, fy))) out[fy * w + fx] = body;
  let edge = x + 2;
  while (at(edge + 1, y) === body) edge += 1;
  const far = Math.min(edge - 2, x + EYE_SPACING);
  for (const [dx, dy] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ] as const)
    out[(y + dy) * w + far + dx] = at(x, y);
  return out;
}

export function buildSprite(source: RawSprite, costume: Costume): Sprite {
  return build(source, decodePixels(source), costume, CELL[costume] ?? 1, SMOOTHED.has(costume));
}

function build(
  raw: RawSprite,
  all: Uint8Array[],
  costume: Costume,
  cell: number,
  smooth: boolean,
): Sprite {
  const [start, end] = LOOPS[costume];
  const riding = all.slice(start, end);
  const flown = LEVEL_EYES.has(costume) ? riding.map((pixels) => levelEyes(raw, pixels)) : riding;
  const loop = costume === "kite" ? walkingLegs(raw, flown) : flown;
  const box = bounds(raw, [...loop, all[0] ?? new Uint8Array()], loop);
  const width = box.right - box.left + 1;
  // The kite flies ahead of Claude; only its feet can hit. Other rides hit
  // with their full front, body included, since tall obstacles reach it.
  const front = (costume === "kite" ? box.footRight : box.right) - box.left + 1;
  const hit = Math.min(front * cell, MAX_HIT_WIDTH);
  return {
    fps: raw.fps,
    frames: loop.map((pixels) => toRects(raw, pixels, box)),
    idle: toRects(raw, all[0] ?? new Uint8Array(), box),
    width: Math.ceil(width * cell),
    hitbox: { x: Math.round(front * cell - hit) + 2, w: Math.round(hit) - 4 },
    ...(cell === 1 ? {} : { cell }),
    ...(smooth ? { fine: smoothed(raw, all, costume, cell) } : {}),
  };
}

function smoothed(raw: RawSprite, all: Uint8Array[], costume: Costume, cell: number): Sprite {
  const twice = scale2x(raw, all);
  return build(twice.raw, twice.frames, costume, cell / 2, false);
}

/** The walking Claude, for the server-rendered frame. */
export function walkLoop(): Sprite {
  return buildSprite(walk as RawSprite, "walk");
}

export const walkSprite = walk as RawSprite;

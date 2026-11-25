import { type Clip, frameRects } from "./model";
import { buildClip } from "./rig";
import { MOVE_DEFS, type MoveId } from "./moves";
import { PROPS, type PropId, type Slot, slotOf } from "./props";

export const FPS = 12;

export const MOVES: readonly { id: MoveId; name: string; free: Slot[]; still: number }[] =
  MOVE_DEFS.map(({ id, name, free, still }) => ({ id, name, free, still }));

export interface Look {
  move: MoveId;
  props: PropId[];
  outline: boolean;
}

export const DEFAULT_LOOK: Look = { move: "wave", props: ["beanie"], outline: true };

const def = (move: MoveId) => MOVE_DEFS.find((m) => m.id === move) ?? MOVE_DEFS[0]!;

export function allowed(move: MoveId, prop: PropId): boolean {
  return def(move).free.includes(slotOf(prop));
}

/** Allowed props only, one per slot (the last wins), in PROPS order. */
export function cleanProps(move: MoveId, props: readonly PropId[]): PropId[] {
  const bySlot = new Map<Slot, PropId>();
  for (const p of props) if (allowed(move, p)) bySlot.set(slotOf(p), p);
  const keep = new Set(bySlot.values());
  return PROPS.filter((p) => keep.has(p.id)).map((p) => p.id);
}

/** Adds the prop, or removes it when worn. A prop in an occupied slot replaces the old one. */
export function toggleProp(look: Look, prop: PropId): Look {
  if (!allowed(look.move, prop)) return look;
  if (look.props.includes(prop)) {
    return { ...look, props: look.props.filter((p) => p !== prop) };
  }
  return { ...look, props: cleanProps(look.move, [...look.props, prop]) };
}

export const stillFrame = (move: MoveId): number => def(move).still;

/** True when the move shows more than one distinct picture, so a frame scrubber means something. */
export function hasMotion(look: Look): boolean {
  const clip = clipFor(look);
  const first = JSON.stringify(frameRects(clip, 0));
  for (let f = 1; f < clip.frames; f++)
    if (JSON.stringify(frameRects(clip, f)) !== first) return true;
  return false;
}

export function frameCount(look: Look): number {
  return clipFor(look).frames;
}

/** Stable identity of a look: cache key and the seed for hashed CSS names. */
export const lookKey = (look: Look): string =>
  `${look.move}|${cleanProps(look.move, look.props).join(",")}|${look.outline ? 1 : 0}`;

const CACHE_LIMIT = 48;
const clips = new Map<string, Clip>();
const boxes = new Map<string, { x: number; y: number; w: number; h: number }>();

export function clipFor(look: Look): Clip {
  const key = lookKey(look);
  let clip = clips.get(key);
  if (!clip) {
    if (clips.size >= CACHE_LIMIT) {
      const oldest = clips.keys().next().value;
      if (oldest !== undefined) {
        clips.delete(oldest);
        boxes.delete(oldest);
      }
    }
    clip = buildClip(def(look.move).spec, cleanProps(look.move, look.props), look.outline);
    clips.set(key, clip);
  }
  return clip;
}

/** Union bounds of every frame, outline included, plus one cell of padding. In cells. */
export function bounds(look: Look): { x: number; y: number; w: number; h: number } {
  const key = lookKey(look);
  const hit = boxes.get(key);
  if (hit) return hit;
  const clip = clipFor(look);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let f = 0; f < clip.frames; f++) {
    for (const r of frameRects(clip, f)) {
      x0 = Math.min(x0, r.x);
      y0 = Math.min(y0, r.y);
      x1 = Math.max(x1, r.x + r.w);
      y1 = Math.max(y1, r.y + r.h);
    }
  }
  const box = { x: x0 - 1, y: y0 - 1, w: x1 - x0 + 2, h: y1 - y0 + 2 };
  boxes.set(key, box);
  return box;
}

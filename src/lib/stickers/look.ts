import { ACTION_DEFS, type ActionDef, type ActionId } from "./actions";
import { ITEM_DEFS, type ItemDef, itemDef, isItemId, type Slot, slotOrder } from "./items";
import { type Clip, frameRects } from "./model";
import { buildClip, type Outline } from "./rig";

export const FPS = 12;

export type ItemId = string;
export type { ActionId, Outline };

export interface Look {
  action: ActionId;
  /** At most one per slot, in sidebar order. Ids are unique across slots. */
  items: ItemId[];
  /** 0 off (soft ground shadow), 1 thin (1 cell), 2 thick (2 cells). */
  outline: Outline;
}

export const DEFAULT_LOOK: Look = { action: "wave", items: ["beanie"], outline: 1 };

export const ACTIONS: readonly Pick<ActionDef, "id" | "name" | "frames" | "still">[] =
  ACTION_DEFS.map(({ id, name, frames, still }) => ({ id, name, frames, still }));

export const ITEMS: readonly Pick<ItemDef, "id" | "name" | "slot" | "anchor" | "claims">[] =
  ITEM_DEFS.map(({ id, name, slot, anchor, claims }) => ({ id, name, slot, anchor, claims }));

const actionDef = (id: ActionId) => ACTION_DEFS.find((a) => a.id === id) ?? ACTION_DEFS[0]!;
export const isActionId = (id: string): id is ActionId => ACTION_DEFS.some((a) => a.id === id);

const slotOf = (id: ItemId): Slot | undefined => itemDef(id)?.slot;

/** Known ids only, one per slot (the last wins), in sidebar order. */
export function cleanItems(ids: readonly string[]): ItemId[] {
  const bySlot = new Map<Slot, ItemId>();
  for (const id of ids) {
    const def = itemDef(id);
    if (def) bySlot.set(def.slot, id);
  }
  return [...bySlot].sort(([a], [b]) => slotOrder(a) - slotOrder(b)).map(([, id]) => id);
}

/** Wears the item, or takes it off when it is already worn. A new pick replaces its slot's item. */
export function setItem(look: Look, id: ItemId): Look {
  if (!isItemId(id)) return look;
  if (look.items.includes(id)) return { ...look, items: look.items.filter((i) => i !== id) };
  return { ...look, items: cleanItems([...look.items, id]) };
}

export function clearSlot(look: Look, slot: Slot): Look {
  return { ...look, items: look.items.filter((id) => slotOf(id) !== slot) };
}

export const stillFrame = (action: ActionId): number => actionDef(action).still;

/** True when the clip shows more than one distinct picture, so a frame scrubber means something. */
export function hasMotion(look: Look): boolean {
  const clip = clipFor(look);
  const first = JSON.stringify(frameRects(clip, 0));
  for (let f = 1; f < clip.frames; f++)
    if (JSON.stringify(frameRects(clip, f)) !== first) return true;
  return false;
}

export function frameCount(look: Look): number {
  return actionDef(look.action).frames;
}

/** Stable identity of a look: cache key and the seed for hashed CSS names. */
export const lookKey = (look: Look): string =>
  `${look.action}|${cleanItems(look.items).join(",")}|${look.outline}`;

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
    const defs = cleanItems(look.items).map((id) => itemDef(id)!);
    clip = buildClip(actionDef(look.action), defs, look.outline);
    clips.set(key, clip);
  }
  return clip;
}

/** Union bounds of every frame, outline included, plus one cell of padding, on whole cells. */
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
  // Whole cells only: the hairline is a quarter cell, and a fractional box lands the art on
  // fractional pixels, where every rect edge antialiases into a visible seam.
  const [fx, fy] = [Math.floor(x0), Math.floor(y0)];
  const box = { x: fx - 1, y: fy - 1, w: Math.ceil(x1) - fx + 2, h: Math.ceil(y1) - fy + 2 };
  boxes.set(key, box);
  return box;
}

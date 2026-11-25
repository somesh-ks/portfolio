import { art, type Layer } from "../model";
import { EFFECT } from "./effect";
import { FACE } from "./face";
import { HAND } from "./hand";
import { HEAD } from "./head";
import { RIDE } from "./ride";
import type { ItemDef, ItemPart, Slot } from "./types";

export type { ItemDef, ItemPart, Slot } from "./types";

/** Sidebar order. */
export const SLOTS: readonly { id: Slot; name: string }[] = [
  { id: "head", name: "Head" },
  { id: "face", name: "Face" },
  { id: "hand", name: "Hand" },
  { id: "effect", name: "Effect" },
  { id: "ride", name: "Ride" },
];

export const ITEM_DEFS: readonly ItemDef[] = [...HEAD, ...FACE, ...HAND, ...EFFECT, ...RIDE];

const byId = new Map(ITEM_DEFS.map((d) => [d.id, d]));
export const itemDef = (id: string): ItemDef | undefined => byId.get(id);
export const isItemId = (id: string): boolean => byId.has(id);
export const slotOrder = (slot: Slot): number => SLOTS.findIndex((s) => s.id === slot);

const parts = new WeakMap<ItemDef, ItemPart[]>();
/** The drawn parts of an item: explicit `parts`, else one part from `layers` or `rows`. */
export function partsOf(def: ItemDef): ItemPart[] {
  let hit = parts.get(def);
  if (!hit) {
    const layers: Layer[] =
      def.layers ?? art(def.rows ?? [], def.at?.[0] ?? 0, def.at?.[1] ?? 0, def.palette ?? {});
    hit = def.parts ?? [{ layers }];
    parts.set(def, hit);
  }
  return hit;
}

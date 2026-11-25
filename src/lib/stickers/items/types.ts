import type { Layer } from "../model";

export type Slot = "head" | "face" | "hand" | "effect" | "ride";

/** What the art follows. See docs/stickers.md for the table. */
type Anchor = "head" | "face" | "handL" | "front" | "ground" | "lane" | "ride";

type Palette = Readonly<Record<string, string>>;

/** One drawn piece of an item. Several parts give back/front layers or separate particles. */
export interface ItemPart {
  layers: Layer[];
  /** Ride only: "back" is drawn behind the legs, "front" (default) in front of the torso. */
  z?: "back" | "front";
  /**
   * Offset of this part on frame `f` of `n`, added to the anchor's offset. `null` hides it on
   * that frame. Omit for a part that is always there. Effects use it to float and twinkle.
   */
  at?: (f: number, n: number) => readonly [number, number] | null;
}

export interface ItemDef {
  /** Unique across every slot. Used in the URL (`p=`) and in file names. */
  id: string;
  name: string;
  slot: Slot;
  anchor: Anchor;
  /** `arms`: both arms take `hold`. `legs`: a ride; the legs follow `seat`. */
  claims?: "arms" | "legs";
  /** ASCII art, one char per cell. '.' and ' ' are empty; other chars map through `palette`. */
  rows?: string[];
  /** Top-left cell of `rows`, in mascot cells (body is 24 x 16, head x 4..19, rows 0..11). */
  at?: readonly [number, number];
  palette?: Palette;
  /** Hand-built layers (use instead of rows when you need alpha or odd rects). */
  layers?: Layer[];
  /** Several parts (back/front, particles). Replaces rows/layers. */
  parts?: ItemPart[];
  /** Offset for the whole item per frame, or null to hide it. */
  pose?: (f: number, n: number) => readonly [number, number] | null;
  /** claims "arms": where each arm goes (relative to the body) on frame `f`. */
  hold?: (f: number) => { armL: readonly [number, number]; armR: readonly [number, number] };
  /** claims "legs": legs stand on the ride ("stand") or are hidden behind it ("hide"). */
  seat?: "stand" | "hide";
  /** Rides: the ground line (mascot-local y) the shadow sits on. Default 16. */
  ground?: number;
  /** Face items: eye colour under the item. The eyes also stop glancing. */
  eyeTint?: string;
  /** Overrides the z band the anchor implies. */
  z?: number;
}

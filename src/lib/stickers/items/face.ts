import { COLORS as K } from "../palette";
import type { ItemDef } from "./types";

/** Anchor "face": follows the body, drawn over the eyes' rows. Eyes take `eyeTint` and hold still. */
export const FACE: ItemDef[] = [
  {
    id: "shades",
    name: "Shades",
    slot: "face",
    anchor: "face",
    at: [4, 1],
    eyeTint: K.skyLight,
    palette: { I: K.ink, S: K.steel, L: K.sky },
    rows: [".IIIII....IIIII.", ".ISSLIIIIIILSSI.", ".ISSSI....ISSSI.", ".IIIII....IIIII."],
  },
];

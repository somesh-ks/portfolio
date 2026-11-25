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
  {
    id: "roundglasses",
    name: "Round glasses",
    slot: "face",
    anchor: "face",
    at: [4, 0],
    eyeTint: K.ink,
    palette: { G: K.coal },
    rows: [
      ".GGGG......GGGG.",
      "G....G....G....G",
      "G....GGGGGG....G",
      "G....G....G....G",
      "G....G....G....G",
      ".GGGG......GGGG.",
    ],
  },
  {
    id: "moustache",
    name: "Moustache",
    slot: "face",
    anchor: "face",
    at: [7, 5],
    palette: { M: K.brown },
    rows: ["M..MMMM..M", ".MMMMMMMM."],
  },
];

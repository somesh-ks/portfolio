/**
 * Any Google font by name, for callers without the font browser (the CLI and
 * the API): the engine needs a family's kind and weights, which the static
 * catalogue holds. Server and CLI only; the catalogue is 76 KB.
 */
import catalogueJson from "../../../public/spring/google-fonts.json";
import { isCurated, type FontMeta, type FontTag } from "./type";

type Row = [string, string, number[], [number, number] | 0, number];
const TAG: Record<string, FontTag> = { s: "sans", r: "serif", d: "display", m: "mono", h: "hand" };
const CATALOGUE = new Map((catalogueJson as Row[]).map((r) => [r[0].toLowerCase(), r]));

/** Any Google font by name: the engine needs its kind and weights, which the catalogue holds. */
export function withFonts(raw: Record<string, unknown>, notes: string[]) {
  const type = (raw.type ?? {}) as Record<string, unknown>;
  const extra = { ...(type.extra as Record<string, FontMeta> | undefined) };
  for (const role of ["body", "heading", "mono"]) {
    const f = type[role];
    if (typeof f !== "string" || isCurated(f) || extra[f]) continue;
    const r = CATALOGUE.get(f.toLowerCase());
    if (!r) {
      notes.push(`type.${role}: "${f}" isn't a Google font Spring knows; used the default.`);
      continue;
    }
    type[role] = r[0];
    extra[r[0]] = { tag: TAG[r[1]] ?? "sans", weights: r[2], variable: r[3] || null };
  }
  if (Object.keys(extra).length) type.extra = extra;
  raw.type = type;
}

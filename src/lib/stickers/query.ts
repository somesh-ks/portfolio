import { cleanItems, DEFAULT_LOOK, frameCount, isActionId, type Look, stillFrame } from "./look";

/** `?m=wave&p=beanie,mug&o=1&fr=3`. Junk falls back to defaults; unknown ids drop. */
export function lookFromQuery(q: URLSearchParams): Look & { frame: number } {
  const m = q.get("m") ?? "";
  const action = isActionId(m) ? m : DEFAULT_LOOK.action;
  const raw = q.get("p");
  const items = cleanItems(raw === null ? DEFAULT_LOOK.items : raw.split(","));
  const o = q.get("o");
  const outline = o === "0" ? 0 : o === "1" ? 1 : o === "2" ? 2 : DEFAULT_LOOK.outline;
  const look: Look = { action, items, outline };
  const fr = q.get("fr");
  const n = fr !== null && /^\d{1,3}$/.test(fr) ? Number(fr) : -1;
  return { ...look, frame: n >= 0 && n < frameCount(look) ? n : stillFrame(action) };
}

/** The query string without the leading `?`. Always spells out every field so it round-trips. */
export function lookToQuery(look: Look, extra?: { frame?: number }): string {
  let s = `m=${look.action}&p=${cleanItems(look.items).join(",")}&o=${look.outline}`;
  if (extra?.frame !== undefined) s += `&fr=${Math.max(0, Math.trunc(extra.frame))}`;
  return s;
}

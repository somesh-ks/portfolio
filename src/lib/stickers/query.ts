import { DEFAULT_LOOK, cleanProps, frameCount, type Look, stillFrame } from "./look";
import { MOVE_DEFS, type MoveId } from "./moves";
import { PROPS, type PropId } from "./props";

const MOVE_IDS = new Set<string>(MOVE_DEFS.map((m) => m.id));
const PROP_IDS = new Set<string>(PROPS.map((p) => p.id));

export type Tab = "static" | "animated";

/** `?m=wave&p=beanie,mug&o=1&t=animated&fr=3`. Junk falls back to defaults; disallowed props drop. */
export function lookFromQuery(q: URLSearchParams): Look & { tab: Tab; frame: number } {
  const m = q.get("m") ?? "";
  const move: MoveId = MOVE_IDS.has(m) ? (m as MoveId) : DEFAULT_LOOK.move;
  const raw = q.get("p");
  const props = cleanProps(
    move,
    raw === null
      ? DEFAULT_LOOK.props
      : raw.split(",").filter((id): id is PropId => PROP_IDS.has(id)),
  );
  const o = q.get("o");
  const outline = o === "0" ? false : o === "1" ? true : DEFAULT_LOOK.outline;
  const look: Look = { move, props, outline };
  const fr = q.get("fr");
  const n = fr !== null && /^\d{1,3}$/.test(fr) ? Number(fr) : -1;
  const frame = n >= 0 && n < frameCount(look) ? n : stillFrame(move);
  return { ...look, tab: q.get("t") === "animated" ? "animated" : "static", frame };
}

/** The query string without the leading `?`. Always spells out every field so it round-trips. */
export function lookToQuery(look: Look, extra?: { tab?: string; frame?: number }): string {
  const props = cleanProps(look.move, look.props).join(",");
  let s = `m=${look.move}&p=${props}&o=${look.outline ? 1 : 0}`;
  if (extra?.tab) s += `&t=${extra.tab === "animated" ? "animated" : "static"}`;
  if (extra?.frame !== undefined) s += `&fr=${Math.max(0, Math.trunc(extra.frame))}`;
  return s;
}

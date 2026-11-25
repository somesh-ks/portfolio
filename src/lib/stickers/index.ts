/**
 * Public API of the sticker engine (the UI and the export route import only from here).
 *
 * Model     Look { action, items, outline }, DEFAULT_LOOK, ACTIONS, ITEMS, SLOTS, ActionId, Outline, Slot
 * Edit      setItem(look, id) toggles and swaps within a slot, clearSlot(look, slot)
 * Frames    FPS, frameCount(look), stillFrame(action), hasMotion(look), bounds(look)
 * Query     lookFromQuery(params) -> Look & { frame }, lookToQuery(look, { frame }?)
 * Output    stickerSvg(look, { animated, frame?, title? }), lottieJson(look)
 * Thumbs    actionThumbSvg(id), itemThumbSvg(id), outlineThumbSvg(0 | 1 | 2)
 * Server    ./export: pngBuffer, gifBuffer, rasterFrame (sharp and gifenc stay out of the client)
 * Add art   items/<slot>.ts (one entry per item), actions.ts (one entry per action); docs/stickers.md
 */
export {
  type ActionId,
  ACTIONS,
  bounds,
  clearSlot,
  DEFAULT_LOOK,
  FPS,
  frameCount,
  hasMotion,
  ITEMS,
  type Look,
  type Outline,
  setItem,
  stillFrame,
} from "./look";
export { SLOTS, type Slot } from "./items";
export { lottieJson } from "./lottie";
export { lookFromQuery, lookToQuery } from "./query";
export { actionThumbSvg, itemThumbSvg, outlineThumbSvg, stickerSvg } from "./svg";

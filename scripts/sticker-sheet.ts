/**
 * Contact sheet: every action at its hero frame with no items, then every item on idle (rides and
 * hand-held items on wave), outline thin. Writes engine-sheet.png (light) and engine-sheet-dark.png
 * (plus combo-sheet.png: twelve hand-picked combinations) into the folder given as the first
 * argument (default /mnt/project-files/sticker-studio/v3).
 * Optional second argument: an outline width 0, 1 or 2.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import {
  ACTIONS,
  frameCount,
  ITEMS,
  type Look,
  type Outline,
  stillFrame,
} from "../src/lib/stickers";
import { rasterFrame } from "../src/lib/stickers/export";

const out = process.argv[2] ?? "/mnt/project-files/sticker-studio/v3";
const outline = (Number(process.argv[3] ?? 1) % 3) as Outline;
mkdirSync(out, { recursive: true });

const SCALE = 4;
const W = 230;
const H = 230;
const COLS = 6;

interface Cell {
  look: Look;
  frame: number;
  label: string;
}
const allCells: Cell[] = [
  ...ACTIONS.map((a) => ({
    look: { action: a.id, items: [], outline },
    frame: stillFrame(a.id),
    label: a.name,
  })),
  ...ITEMS.map((i) => {
    const action = i.slot === "ride" ? "wave" : "idle";
    return {
      look: { action, items: [i.id], outline } as Look,
      frame:
        i.slot === "effect"
          ? Math.floor(frameCount({ action, items: [], outline } as Look) * 0.85)
          : stillFrame(action),
      label: `${i.name} · ${i.anchor}`,
    };
  }),
];

const COMBOS: [Look["action"], string[]][] = [
  ["wave", ["captain", "vasa"]],
  ["dance", ["crayhat", "crayfish"]],
  ["idle", ["polar", "kanelbulle", "steam"]],
  ["zen", ["flowers", "sparkles"]],
  ["jump", ["headphones", "skate"]],
  ["walk", ["party", "balloon"]],
  ["cheer", ["crown", "flag"]],
  ["sleep", ["beanie", "zzz"]],
  ["idle", ["toque", "meatballs"]],
  ["wave", ["vippass", "shades"]],
  ["walk", ["metro"]],
  ["dance", ["dala", "notes"]],
];
const comboCells: Cell[] = COMBOS.map(([action, ids]) => {
  const look: Look = { action, items: ids, outline };
  const fx = ids.some((id) => ITEMS.find((i) => i.id === id)?.slot === "effect");
  return {
    look,
    frame: fx ? Math.floor(frameCount(look) * 0.85) : stillFrame(action),
    label: `${action} + ${ids.join(" + ")}`,
  };
});

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

async function sheet(file: string, bg: string, fg: string, cells: Cell[] = allCells) {
  const rows = Math.ceil(cells.length / COLS);
  const overlays: OverlayOptions[] = [];
  for (const [i, c] of cells.entries()) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const { width, height, data } = rasterFrame(c.look, c.frame, SCALE, false);
    const sw = Math.min(width, W);
    const sh = Math.min(height, H - 24);
    const img = await sharp(Buffer.from(data), { raw: { width, height, channels: 4 } })
      .resize(sw, sh, { fit: "inside", kernel: "nearest" })
      .png()
      .toBuffer();
    overlays.push({
      input: img,
      left: col * W + Math.floor((W - sw) / 2),
      top: row * H + Math.floor((H - 24 - sh) / 2),
    });
    overlays.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="22"><text x="${W / 2}" y="15" font-family="sans-serif" font-size="13" fill="${fg}" text-anchor="middle">${esc(c.label)}</text></svg>`,
      ),
      left: col * W,
      top: row * H + H - 24,
    });
  }
  await sharp({
    create: { width: COLS * W, height: rows * H, channels: 4, background: bg },
  })
    .composite(overlays)
    .png()
    .toFile(path.join(out, file));
  console.warn(`wrote ${path.join(out, file)}`);
}

await sheet("engine-sheet.png", "#F3F1EA", "#141413");
await sheet("engine-sheet-dark.png", "#1F1E1D", "#E8E6DC");
await sheet("combo-sheet.png", "#F3F1EA", "#141413", comboCells);

/**
 * Contact sheet: every move at its still frame, with each prop it allows (first column bare).
 * Writes sheet.png (outline on), sheet-plain.png (outline off) and sheet-dark.png into the
 * folder given as the first argument (default /mnt/project-files/sticker-studio).
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { allowed, MOVES, PROPS } from "../src/lib/stickers";
import { rasterFrame } from "../src/lib/stickers/export";

const out = process.argv[2] ?? "/mnt/project-files/sticker-studio";
mkdirSync(out, { recursive: true });

const SCALE = 4;
const CELL_W = 190;
const CELL_H = 190;
const cols = [null, ...PROPS];

async function sheet(file: string, outline: boolean, bg: string) {
  const overlays: OverlayOptions[] = [];
  for (const [row, move] of MOVES.entries()) {
    for (const [col, prop] of cols.entries()) {
      if (prop && !allowed(move.id, prop.id)) continue;
      const look = { move: move.id, props: prop ? [prop.id] : [], outline };
      const { width, height, data } = rasterFrame(look, move.still, SCALE, false);
      overlays.push({
        input: Buffer.from(data),
        raw: { width, height, channels: 4 },
        left: col * CELL_W + Math.max(0, Math.floor((CELL_W - width) / 2)),
        top: row * CELL_H + Math.max(0, Math.floor((CELL_H - height) / 2)),
      });
    }
  }
  await sharp({
    create: {
      width: cols.length * CELL_W,
      height: MOVES.length * CELL_H,
      channels: 4,
      background: bg,
    },
  })
    .composite(overlays)
    .png()
    .toFile(path.join(out, file));
  console.warn(`wrote ${path.join(out, file)}`);
}

await sheet("sheet.png", true, "#F3F1EA");
await sheet("sheet-plain.png", false, "#F3F1EA");
await sheet("sheet-dark.png", true, "#1F1E1D");

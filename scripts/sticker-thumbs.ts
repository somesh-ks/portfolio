/**
 * Renders the picker's thumbnails (every action, then every item) on light and dark tiles into
 * thumbs-light.png and thumbs-dark.png in the folder given as the first argument.
 * Colours are the site's tokens for --surface-sunken and --text-primary.
 */
import { mkdirSync } from "node:fs";
import sharp from "sharp";
import { ACTIONS, ITEMS } from "../src/lib/stickers";
import { actionThumbSvg, itemThumbSvg } from "../src/lib/stickers/svg";

const out = process.argv[2] ?? "/mnt/project-files/sticker-studio/v4";
mkdirSync(out, { recursive: true });
const TILE = 300;
const COLS = 8;
const THEMES = {
  light: { bg: "#EFEDE6", fg: "#1F1F1E" },
  dark: { bg: "#1C1C1B", fg: "#F0EEE6" },
} as const;
const svgs = [...ACTIONS.map((a) => actionThumbSvg(a.id)), ...ITEMS.map((i) => itemThumbSvg(i.id))];

for (const [name, t] of Object.entries(THEMES)) {
  const tiles = await Promise.all(
    svgs.map(async (s) => {
      const png = await sharp(Buffer.from(s.replaceAll("currentColor", t.fg)), { density: 96 })
        .resize(TILE - 40, TILE - 40, { fit: "inside", kernel: "nearest" })
        .png()
        .toBuffer();
      return sharp({ create: { width: TILE, height: TILE, channels: 4, background: t.bg } })
        .composite([{ input: png, gravity: "centre" }])
        .png()
        .toBuffer();
    }),
  );
  const rows = Math.ceil(tiles.length / COLS);
  await sharp({
    create: { width: COLS * TILE, height: rows * TILE, channels: 4, background: t.bg },
  })
    .composite(
      tiles.map((input, i) => ({
        input,
        left: (i % COLS) * TILE,
        top: Math.floor(i / COLS) * TILE,
      })),
    )
    .png()
    .toFile(`${out}/thumbs-${name}.png`);
}

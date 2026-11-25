import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { OG_SIZE } from "@/lib/og";
import { bounds, DEFAULT_LOOK, stickerSvg } from "@/lib/stickers";

export const alt = "Claude sticker studio, a tool by Somesh Kesarla Suresh";
export const size = OG_SIZE;
export const contentType = "image/png";

// next/og renders outside the page's CSS: the dark theme's canvas, text.primary and
// text.secondary as hex, like the other share cards.
const CANVAS = "#0c0c0c";
const INK = "#ededed";
const MUTED = "#a1a1a1";

export default async function Image() {
  const [sans, mono] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/og/geist-600.ttf")),
    readFile(join(process.cwd(), "src/assets/og/geist-mono-400.ttf")),
  ]);
  const b = bounds(DEFAULT_LOOK);
  const cell = Math.floor(400 / Math.max(b.w, b.h));
  const svg = stickerSvg(DEFAULT_LOOK, { animated: false });
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 96px",
        background: CANVAS,
        color: INK,
        fontFamily: "Geist Mono",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ fontFamily: "Geist", fontSize: 84, lineHeight: 1.05, letterSpacing: -2 }}>
          Claude sticker studio
        </div>
        <div style={{ fontSize: 32, color: MUTED }}>Customize your claude</div>
        <div style={{ fontSize: 24, color: MUTED, marginTop: 24 }}>someshks.com/stickers</div>
      </div>
      {/* oxlint-disable-next-line nextjs/no-img-element */}
      <img src={src} width={b.w * cell} height={b.h * cell} alt="" />
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: "Geist", data: sans, weight: 600, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}

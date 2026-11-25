import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

// next/og renders outside the page's CSS, so these mirror the dark theme's
// surface.canvas, text.primary, text.secondary and border tokens.
const CANVAS = "#0c0c0c";
const INK = "#ededed";
const MUTED = "#a1a1a1";
const RULE = "#2a2a2a";

const fonts = Promise.all([
  readFile(join(process.cwd(), "src/assets/og/geist-600.ttf")),
  readFile(join(process.cwd(), "src/assets/og/geist-mono-400.ttf")),
]).then(([sans, mono]) => [
  { name: "Geist", data: sans, weight: 600 as const, style: "normal" as const },
  { name: "Geist Mono", data: mono, weight: 400 as const, style: "normal" as const },
]);

/**
 * The share card: title and one line on a dark terminal canvas, then a
 * hairline and a mono footer with the page's address and what it is.
 * No label above the title, the same rule as the site.
 */
export async function ogCard({
  title,
  summary,
  path = "/",
  meta,
}: {
  title: string;
  summary?: string;
  /** The page's path, shown as its address. */
  path?: string;
  /** A short mono note on the right of the footer, e.g. "case study". */
  meta?: string;
}) {
  const address = `someshks.com${path === "/" ? "" : path}`;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: CANVAS,
        color: INK,
        fontFamily: "Geist Mono",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 28, padding: "88px 80px 0" }}>
        <div
          style={{
            fontFamily: "Geist",
            fontSize: 88,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        {summary ? (
          <div style={{ fontSize: 36, lineHeight: 1.35, color: MUTED, maxWidth: 960 }}>
            {summary}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: `1px solid ${RULE}`,
          padding: "32px 80px 40px",
          fontSize: 26,
          color: MUTED,
        }}
      >
        <div style={{ display: "flex" }}>
          <span style={{ color: INK }}>$</span>&nbsp;{address}
        </div>
        {meta ? <div style={{ display: "flex" }}>{meta}</div> : null}
      </div>
    </div>,
    { ...OG_SIZE, fonts: await fonts },
  );
}

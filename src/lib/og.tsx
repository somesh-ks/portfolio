import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

// next/og renders outside the page's CSS, so the canvas and ink mirror
// surface.canvas / text.primary / text.secondary / illustration.mascot from tokens.
const PAPER = "#fcfbf8";
const INK = "#1c1b19";
const MUTED = "#6f6c66";
const CLAY = "#d4774f";

export function ogCard({
  eyebrow,
  title,
  summary,
}: {
  eyebrow: string;
  title: string;
  summary?: string;
}) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: PAPER,
        color: INK,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28, color: MUTED }}>
        <div style={{ width: 20, height: 20, background: CLAY }} />
        {eyebrow}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            fontSize: 76,
            lineHeight: 1.05,
            letterSpacing: -2,
            fontWeight: 600,
            maxWidth: 980,
          }}
        >
          {title}
        </div>
        {summary ? (
          <div style={{ fontSize: 32, lineHeight: 1.35, color: MUTED, maxWidth: 960 }}>
            {summary}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", fontSize: 26, color: MUTED }}>someshks.com</div>
    </div>,
    OG_SIZE,
  );
}

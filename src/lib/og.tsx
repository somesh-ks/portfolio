import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { walkLoop } from "./runner/claude-sprites";
import { CLOUD, OBSTACLE_SPRITES, type ObstacleKind, type Tone } from "./runner/sprites";

export const OG_SIZE = { width: 1200, height: 630 };

// next/og renders outside the page's CSS, so these mirror the dark theme's
// surface.canvas, text.primary and text.secondary, and the runner's
// illustration tokens (globals.css) as hex.
const CANVAS = "#0c0c0c";
const INK = "#ededed";
const MUTED = "#a1a1a1";
const GROUND = "#3a3a3a";
const CLOUD_INK = "#2c2c2c";
const TONES: Partial<Record<Tone, string>> = {
  body: "#d97757",
  shade: "#be684d",
  ink: "#141413",
  sky: "#6a9bcc",
  sand: "#e8c9a0",
  moss: "#788c5d",
  cream: "#faf9f5",
};

const fonts = Promise.all([
  readFile(join(process.cwd(), "src/assets/og/geist-600.ttf")),
  readFile(join(process.cwd(), "src/assets/og/geist-mono-400.ttf")),
]).then(([sans, mono]) => [
  { name: "Geist", data: sans, weight: 600 as const, style: "normal" as const },
  { name: "Geist Mono", data: mono, weight: 400 as const, style: "normal" as const },
]);

type Rect = readonly [number, number, number, number, string];
interface Art {
  src: string;
  width: number;
  height: number;
}

/** Pixel art as a crisp SVG data URI, one cell = `cell` px. */
function pixels(rects: readonly Rect[], w: number, h: number, cell: number): Art {
  const body = rects
    .map(
      ([x, y, rw, rh, c]) => `<rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="${c}"/>`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${body}</svg>`;
  return {
    src: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    width: w * cell,
    height: h * cell,
  };
}

const CELL = 8;
const GROUND_Y = 548;

function claude(): Art {
  // The walk sprite's rects sit on y = 0 and grow upward.
  const { idle, width } = walkLoop();
  return pixels(
    idle.map(([x, y, w, h, c]) => [x, y + 18, w, h, c] as Rect),
    width,
    18,
    CELL,
  );
}

function obstacle(kind: ObstacleKind): Art {
  const o = OBSTACLE_SPRITES[kind];
  return pixels(
    o.cells.map(([x, y, w, h, t]) => [x, y, w, h, TONES[t] ?? INK] as Rect),
    o.w,
    o.h,
    CELL,
  );
}

const cloud = () =>
  pixels(
    CLOUD.map(([x, y, w]) => [x, y, w, 1, CLOUD_INK] as Rect),
    14,
    4,
    6,
  );

/** The homepage runner, still: Claude, desk obstacles and two clouds on a ground line. */
function Scene() {
  const items: [Art, number][] = [
    [claude(), 80],
    [obstacle("mug"), 420],
    [obstacle("docs"), 640],
    [obstacle("plant"), 860],
    [obstacle("bug"), 1040],
  ];
  const clouds: [number, number][] = [
    [560, 348],
    [930, 388],
  ];
  const at = (art: Art, x: number, y: number, key: string) => (
    // next/og draws plain <img>; next/image has no meaning here.
    // oxlint-disable-next-line nextjs/no-img-element
    <img
      key={key}
      src={art.src}
      width={art.width}
      height={art.height}
      alt=""
      style={{ position: "absolute", left: x, top: y }}
    />
  );
  return (
    <div
      style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, display: "flex" }}
    >
      {clouds.map(([x, y], i) => at(cloud(), x, y, `c${i}`))}
      {items.map(([art, x], i) => at(art, x, GROUND_Y - art.height, `i${i}`))}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: GROUND_Y,
          width: 1200,
          height: 2,
          background: GROUND,
        }}
      />
    </div>
  );
}

/**
 * The share card: title and one line over a still of the homepage runner,
 * then the page's address on a mono prompt. No label above the title.
 */
export async function ogCard({
  title,
  summary,
  path = "/",
}: {
  title: string;
  summary?: string;
  /** The page's path, shown as its address. */
  path?: string;
}) {
  const address = `someshks.com${path === "/" ? "" : path}`;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: CANVAS,
        color: INK,
        fontFamily: "Geist Mono",
      }}
    >
      <Scene />
      <div style={{ display: "flex", flexDirection: "column", gap: 22, padding: "72px 80px 0" }}>
        <div
          style={{
            fontFamily: "Geist",
            fontSize: title.length > 28 ? 76 : 84,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 1040,
          }}
        >
          {title}
        </div>
        {summary ? (
          <div style={{ fontSize: 32, lineHeight: 1.35, color: MUTED, maxWidth: 1040 }}>
            {summary}
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: "absolute",
          left: 80,
          top: GROUND_Y + 30,
          display: "flex",
          fontSize: 24,
          color: MUTED,
        }}
      >
        <span style={{ color: INK }}>$</span>&nbsp;{address}
      </div>
    </div>,
    { ...OG_SIZE, fonts: await fonts },
  );
}

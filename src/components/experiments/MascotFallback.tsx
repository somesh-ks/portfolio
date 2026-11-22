import { frame, GRID } from "@/lib/mascot";

const FILL = {
  body: "var(--illustration-mascot)",
  eye: "var(--illustration-mascot-ink)",
  limb: "var(--illustration-mascot)",
} as const;

/** First idle frame as static SVG: the server-rendered, no-JS fallback. */
export function MascotFallback() {
  return (
    <svg
      viewBox={`0 -4 ${GRID.width} ${GRID.height + 4}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="mascot-fallback"
    >
      {frame("idle", 0).map((rect) => (
        <rect
          key={`${rect.x}-${rect.y}-${rect.part}`}
          x={rect.x}
          y={rect.y}
          width={rect.w}
          height={rect.h}
          fill={FILL[rect.part]}
        />
      ))}
    </svg>
  );
}

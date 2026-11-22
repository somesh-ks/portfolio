import { frame, GRID, type Rect } from "@/lib/mascot";

const FILL = {
  body: "var(--illustration-mascot)",
  eye: "var(--illustration-mascot-ink)",
  limb: "var(--illustration-mascot)",
} as const;

/** Deterministic "hand-drawn" drift: half-pixel offsets and a stray colour. */
function drift(rects: Rect[], seed: number): (Rect & { stray?: boolean })[] {
  return rects.map((rect, index) => {
    const wobble = ((index * 7 + seed * 3) % 5) - 2;
    return {
      ...rect,
      x: rect.x + wobble * 0.25,
      y: rect.y + (wobble % 2) * 0.35,
      stray: (index + seed) % 6 === 0,
    };
  });
}

const POSES = [
  { animation: "idle", t: 0 },
  { animation: "wave", t: 0 },
  { animation: "jump", t: 0.3 },
  { animation: "look", t: 0.5 },
] as const;

export function StickerSheetDraft({ clean }: { clean: boolean }) {
  return (
    <div className="sticker-draft">
      {POSES.map((pose, index) => {
        const rects = frame(pose.animation, pose.t);
        const shown = clean ? rects : drift(rects, index + 1);
        return (
          <svg
            key={pose.animation}
            viewBox={`0 -4 ${GRID.width} ${GRID.height + 4}`}
            shapeRendering={clean ? "crispEdges" : "auto"}
            aria-hidden="true"
            className="sticker-draft__cell"
          >
            {clean ? (
              <g className="sticker-draft__grid">
                {Array.from({ length: GRID.width + 1 }, (_, x) => (
                  <line key={`x${x}`} x1={x} y1={-4} x2={x} y2={GRID.height} />
                ))}
              </g>
            ) : null}
            {shown.map((rect) => (
              <rect
                key={`${rect.part}-${rect.x}-${rect.y}`}
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.h}
                fill={"stray" in rect && rect.stray ? "var(--text-danger)" : FILL[rect.part]}
              />
            ))}
          </svg>
        );
      })}
    </div>
  );
}

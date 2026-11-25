import type { CSSProperties } from "react";
import { FRAME, THUMBS } from "@/lib/thumbs/art";

/**
 * A row's hover thumbnail: inline SVG from src/lib/thumbs/art.tsx, drawn in
 * the site's tokens so it follows light and dark with no second image.
 * Decorative: the row's title already names it.
 */
export function RowThumb({ slug }: { slug: string }) {
  const art = THUMBS[slug];
  if (!art) return null;
  return (
    <svg
      className="list-row__thumb thumb"
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      style={{ "--thumb-accent": `var(${art.accent})` } as CSSProperties}
    >
      {art.draw()}
    </svg>
  );
}

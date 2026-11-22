"use client";

import { MousePointer2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BeforeAfter } from "./BeforeAfter";
import { useAutoplay } from "./useAutoplay";

const TABS = ["Overview", "Files", "Settings"];

/** A tab bar. While `sweeping`, a drawn cursor glides across it and drives the hover state. */
function Tabs({
  flush,
  sweeping,
  onReal,
}: {
  flush: boolean;
  sweeping: boolean;
  onReal: () => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const cursor = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!sweeping) return;
    let frame = requestAnimationFrame(function follow() {
      const tip = cursor.current?.getBoundingClientRect();
      if (tip) {
        const under = document.elementFromPoint(tip.left + 1, tip.top + 1);
        setHovered(under?.closest<HTMLElement>(".hit-tabs__tab")?.dataset.tab ?? null);
      }
      frame = requestAnimationFrame(follow);
    });
    return () => cancelAnimationFrame(frame);
  }, [sweeping]);
  const hover = (tab: string | null) => {
    onReal();
    setHovered(tab);
  };
  return (
    <div className="hit-demo">
      <div
        className={`hit-tabs hit-tabs--${flush ? "fixed" : "typical"}`}
        onPointerLeave={() => hover(null)}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className="hit-tabs__tab"
            data-tab={tab}
            onPointerEnter={() => hover(tab)}
            onPointerLeave={() => hover(null)}
            data-hovered={hovered === tab}
          >
            <span className="hit-tabs__label">{tab}</span>
          </button>
        ))}
        {sweeping ? (
          <span ref={cursor} className="hit-demo__cursor" aria-hidden="true">
            <MousePointer2 size={16} strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
      <p className="hit-demo__readout" aria-hidden="true">
        Hovering: {hovered ?? "nothing"}
      </p>
    </div>
  );
}

/** Tabs spaced with `gap` leave dead zones (hatched) where hover drops; flush tabs with inner padding do not. */
export function HitAreaDemo() {
  const { ref, playing, stop } = useAutoplay();
  return (
    <BeforeAfter
      ref={ref}
      title="Hover with no dead zones"
      line="Before, hover drops in the hatched gaps between tabs."
      before={<Tabs flush={false} sweeping={playing} onReal={stop} />}
      after={<Tabs flush sweeping={playing} onReal={stop} />}
    />
  );
}

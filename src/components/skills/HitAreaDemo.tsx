"use client";

import { useState } from "react";
import { DemoFrame, type DemoMode } from "./DemoFrame";

const TABS = ["Overview", "Activity", "Files", "Settings"];

/** Tabs spaced with `gap` leave dead zones where hover drops; flush tabs with inner padding do not. */
export function HitAreaDemo() {
  const [mode, setMode] = useState<DemoMode>("typical");
  const [showAreas, setShowAreas] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <DemoFrame
      label="Tab bar version"
      mode={mode}
      onMode={setMode}
      caption={{
        typical:
          "Move the pointer slowly across the tabs. A gap is empty DOM, so hover drops between tabs and a click there lands on nothing.",
        fixed:
          "The tabs sit flush and the spacing lives inside each tab as padding, so the pointer is always over a target.",
      }}
      extra={
        <label className="skill-demo__switch">
          <input
            type="checkbox"
            checked={showAreas}
            onChange={(event) => setShowAreas(event.target.checked)}
          />
          Show hit areas
        </label>
      }
    >
      <div
        className={`hit-tabs hit-tabs--${mode}${showAreas ? " hit-tabs--show" : ""}`}
        onPointerLeave={() => setHovered(null)}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className="hit-tabs__tab"
            onPointerEnter={() => setHovered(tab)}
            onPointerLeave={() => setHovered(null)}
            data-hovered={hovered === tab}
          >
            <span className="hit-tabs__label">{tab}</span>
          </button>
        ))}
      </div>
      <p className="skill-demo__readout" aria-hidden="true">
        Hovering: {hovered ?? "nothing"}
      </p>
    </DemoFrame>
  );
}

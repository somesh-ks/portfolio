"use client";

import type { ReactNode } from "react";
import { Segmented } from "@/components/experiments/Segmented";
import { useSound } from "@/components/providers/SoundProvider";

const DEMO_MODES = ["typical", "fixed"] as const;
export type DemoMode = (typeof DEMO_MODES)[number];

/** Shared shell for the skill demos: a Typical / With the skill toggle, a stage and a caption. */
export function DemoFrame({
  label,
  mode,
  onMode,
  caption,
  extra,
  children,
}: {
  label: string;
  mode: DemoMode;
  onMode: (mode: DemoMode) => void;
  caption: Record<DemoMode, string>;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const { play } = useSound();
  return (
    <figure className="toy skill-demo">
      <div className="toy__bar">
        <Segmented
          label={label}
          options={DEMO_MODES}
          value={mode}
          onChange={(next) => {
            onMode(next);
            play("toggle");
          }}
          render={(option) => (option === "typical" ? "Typical agent" : "With the skill")}
        />
        {extra}
      </div>
      <div className="skill-demo__stage">{children}</div>
      <figcaption className="toy__caption" aria-live="polite">
        {caption[mode]}
      </figcaption>
    </figure>
  );
}

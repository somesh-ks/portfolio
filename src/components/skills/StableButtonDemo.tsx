"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DemoFrame, type DemoMode } from "./DemoFrame";

type Phase = "idle" | "saving" | "saved";

const LABEL: Record<Phase, string> = {
  idle: "Save changes",
  saving: "Saving",
  saved: "Saved",
};

function Content({ phase }: { phase: Phase }) {
  return (
    <span className="stable-button__content">
      {phase === "saving" ? (
        <LoaderCircle aria-hidden="true" size={15} className="stable-button__spin" />
      ) : phase === "saved" ? (
        <Check aria-hidden="true" size={15} strokeWidth={2} />
      ) : null}
      {LABEL[phase]}
    </span>
  );
}

/** A save button whose content swaps. Typical: width jumps. Fixed: every state in one grid cell. */
export function StableButtonDemo() {
  const [mode, setMode] = useState<DemoMode>("typical");
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const run = () => {
    if (phase !== "idle") return;
    setPhase("saving");
    timers.current.push(
      setTimeout(() => setPhase("saved"), 1200),
      setTimeout(() => setPhase("idle"), 2600),
    );
  };
  return (
    <DemoFrame
      label="Button version"
      mode={mode}
      onMode={setMode}
      caption={{
        typical:
          "Press Save. The content swaps, the button resizes and Cancel jumps sideways under the pointer.",
        fixed:
          "Every state is stacked in one grid cell and only the active one is visible, so the widest state sets the width and nothing moves.",
      }}
    >
      <div className="stable-row">
        <button type="button" className="button">
          Cancel
        </button>
        <button
          type="button"
          className={`button button--primary stable-button stable-button--${mode}`}
          onClick={run}
          aria-live="polite"
        >
          {mode === "typical" ? (
            <Content phase={phase} />
          ) : (
            <span className="stable-button__stack">
              {(Object.keys(LABEL) as Phase[]).map((state) => (
                <span key={state} aria-hidden={state !== phase} data-active={state === phase}>
                  <Content phase={state} />
                </span>
              ))}
            </span>
          )}
        </button>
      </div>
    </DemoFrame>
  );
}

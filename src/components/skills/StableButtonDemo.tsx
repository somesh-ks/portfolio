"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { BeforeAfter } from "./BeforeAfter";
import { useAutoplay, useEvery } from "./useAutoplay";

type Phase = "idle" | "saving" | "saved";
const PHASES: Phase[] = ["idle", "saving", "saved"];

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

/** A save button whose content swaps. Before: the width jumps. After: every state in one grid cell.
 * Both sides share one phase, so pressing either plays them together. */
export function StableButtonDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const { ref, playing } = useAutoplay();
  // Each phase schedules the next: saving for 1.2s, saved for 1.4s, then idle.
  useEffect(() => {
    if (phase === "idle") return;
    const id = setTimeout(
      () => setPhase(phase === "saving" ? "saved" : "idle"),
      phase === "saving" ? 1200 : 1400,
    );
    return () => clearTimeout(id);
  }, [phase]);
  const run = () => setPhase((current) => (current === "idle" ? "saving" : current));
  useEvery(playing, 3600, run);
  const row = (stable: boolean) => (
    <div className="stable-stage">
      {/* Dashed frames mark where the buttons sat at rest, so any jump shows. */}
      <div className="stable-row stable-row--ghost" aria-hidden="true">
        <span className="button">Cancel</span>
        <span className="button button--primary">{LABEL.idle}</span>
      </div>
      <div className="stable-row">
        <button type="button" className="button">
          Cancel
        </button>
        <button type="button" className="button button--primary" onClick={run}>
          {stable ? (
            <span className="stable-button__stack">
              {PHASES.map((state) => (
                <span key={state} aria-hidden={state !== phase} data-active={state === phase}>
                  <Content phase={state} />
                </span>
              ))}
            </span>
          ) : (
            <Content phase={phase} />
          )}
        </button>
      </div>
    </div>
  );
  return (
    <BeforeAfter
      ref={ref}
      label="A save button that keeps its size"
      before={row(false)}
      after={row(true)}
    />
  );
}

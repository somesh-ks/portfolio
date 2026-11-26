"use client";

import { useState } from "react";
import { Segmented } from "@/components/experiments/Segmented";
import { useSound } from "@/components/providers/SoundProvider";
import { ComicBlueprint, ComicProse, ComicSpread } from "./ComicScenes";

const STAGES = ["prose", "blueprint", "spread"] as const;
type Stage = (typeof STAGES)[number];
const LABELS: Record<Stage, string> = {
  prose: "1. Prose",
  blueprint: "2. Blueprint",
  spread: "3. Page",
};
const NOTES: Record<Stage, string> = {
  prose: "The source: Mary Shelley's Chapter 5 passage fixes the rain, candle, and table.",
  blueprint: "Page 18 locks two tiers: gothic window rain above, the galvanic spark below.",
  spread: "Rendered against the character sheets and five-pigment gothic lock as a 16:9 page.",
};

export function ComicStageScrubber() {
  const [stage, setStage] = useState<Stage>("prose");
  const { play } = useSound();
  return (
    <figure className="toy comic-stages">
      <Segmented
        label="Pipeline stage"
        options={STAGES}
        value={stage}
        onChange={(next) => {
          setStage(next);
          play("tick");
        }}
        render={(option) => LABELS[option]}
      />
      <div className="comic-stages__view">
        {STAGES.map((option) => (
          <div
            key={option}
            className="comic-stages__layer"
            data-active={option === stage}
            aria-hidden={option !== stage}
          >
            {option === "prose" ? (
              <ComicProse />
            ) : option === "blueprint" ? (
              <ComicBlueprint />
            ) : (
              <ComicSpread />
            )}
          </div>
        ))}
      </div>
      <figcaption className="toy__caption" aria-live="polite">
        {NOTES[stage]}
      </figcaption>
    </figure>
  );
}

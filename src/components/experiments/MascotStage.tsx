"use client";

/**
 * Homepage delighter: the <claude-mascot> element with a few controls.
 * Tap the mascot to make it jump; switch animations; reveal the rect grid.
 */
import { Grid3x3 } from "lucide-react";
import { useState } from "react";
import { useSound } from "@/components/providers/SoundProvider";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { ANIMATIONS, type Animation } from "@/lib/mascot";
import { MascotFallback } from "./MascotFallback";
import { Segmented } from "./Segmented";
import { useMascotElement } from "./useMascotElement";

const LABELS: Record<Animation, string> = {
  idle: "Idle",
  wave: "Wave",
  jump: "Jump",
  blink: "Blink",
  look: "Look",
};

export function MascotStage() {
  const mascot = useMascotElement();
  const { play } = useSound();
  const [animation, setAnimation] = useState<Animation>("idle");
  const [grid, setGrid] = useState(false);
  const [hops, setHops] = useState(0);

  return (
    <figure className="stage" aria-label="Interactive mascot">
      <div className="stage__canvas">
        <button
          type="button"
          className="stage__mascot"
          aria-label="Make the mascot jump"
          onClick={() => {
            mascot.current?.play("jump");
            play("pop");
            setHops((count) => count + 1);
          }}
        >
          <claude-mascot ref={mascot} animation={animation} grid={grid || undefined}>
            <MascotFallback />
          </claude-mascot>
        </button>
      </div>
      <div className="stage__controls">
        <Segmented
          label="Animation"
          options={ANIMATIONS}
          value={animation}
          onChange={(next) => {
            setAnimation(next);
            play("tick");
          }}
          render={(option) => LABELS[option]}
        />
        <div className="stage__tools">
          <button
            type="button"
            aria-pressed={grid}
            onClick={() => {
              setGrid((on) => !on);
              play("toggle");
            }}
            className="icon-button pressable"
          >
            <Grid3x3 aria-hidden="true" size={16} strokeWidth={1.75} />
            <span className="sr-only">Show rect grid</span>
          </button>
          <SoundToggle />
        </div>
      </div>
      <figcaption className="stage__caption">
        {hops > 2
          ? `${hops} jumps. It never gets tired, it is only rectangles.`
          : "Nine rectangles, no images. Tap it, or turn on the grid to see the model."}
      </figcaption>
    </figure>
  );
}

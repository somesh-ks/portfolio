"use client";

import { Check, Copy, Download, Grid3x3, Pause, Play } from "lucide-react";
import { useState } from "react";
import { useSound } from "@/components/providers/SoundProvider";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { ANIMATIONS, exportAnimatedSvg, exportLottie, frame, type Animation } from "@/lib/mascot";
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

function download(name: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function ClaudeMascotStudio() {
  const mascot = useMascotElement();
  const { play } = useSound();
  const [animation, setAnimation] = useState<Animation>("wave");
  const [grid, setGrid] = useState(true);
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const rects = frame(animation, 0);

  const markup = `<claude-mascot animation="${animation}"></claude-mascot>`;

  return (
    <div className="toy studio">
      <div className="stage__canvas stage__canvas--large">
        <claude-mascot
          ref={mascot}
          animation={animation}
          grid={grid || undefined}
          paused={paused || undefined}
        >
          <MascotFallback />
        </claude-mascot>
      </div>
      <div className="toy__bar">
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
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
            className="icon-button pressable"
          >
            {paused ? (
              <Play aria-hidden="true" size={16} strokeWidth={1.75} />
            ) : (
              <Pause aria-hidden="true" size={16} strokeWidth={1.75} />
            )}
            <span className="sr-only">Pause animation</span>
          </button>
          <button
            type="button"
            aria-pressed={grid}
            onClick={() => setGrid((value) => !value)}
            className="icon-button pressable"
          >
            <Grid3x3 aria-hidden="true" size={16} strokeWidth={1.75} />
            <span className="sr-only">Show rect grid</span>
          </button>
          <SoundToggle />
        </div>
      </div>
      <details className="toy__details">
        <summary>Rect model, first frame ({rects.length} rects)</summary>
        <pre className="toy__code">
          <code>
            {rects
              .map(
                (rect) => `${rect.part.padEnd(5)} x=${rect.x} y=${rect.y} w=${rect.w} h=${rect.h}`,
              )
              .join("\n")}
          </code>
        </pre>
      </details>
      <div className="toy__actions">
        <button
          type="button"
          className="button pressable"
          onClick={() =>
            download(`mascot-${animation}.svg`, exportAnimatedSvg(animation), "image/svg+xml")
          }
        >
          <Download aria-hidden="true" size={15} strokeWidth={1.75} />
          Animated SVG
        </button>
        <button
          type="button"
          className="button pressable"
          onClick={() =>
            download(
              `mascot-${animation}.json`,
              JSON.stringify(exportLottie(animation)),
              "application/json",
            )
          }
        >
          <Download aria-hidden="true" size={15} strokeWidth={1.75} />
          Lottie JSON
        </button>
        <button
          type="button"
          className="button pressable"
          data-sound="none"
          onClick={async () => {
            await navigator.clipboard.writeText(markup);
            setCopied(true);
            play("pop");
            window.setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? (
            <Check aria-hidden="true" size={15} strokeWidth={2} />
          ) : (
            <Copy aria-hidden="true" size={15} strokeWidth={1.75} />
          )}
          <span aria-live="polite">{copied ? "Copied" : "Copy element"}</span>
        </button>
      </div>
    </div>
  );
}

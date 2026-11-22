"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { BeforeAfter } from "./BeforeAfter";
import { useAutoplay } from "./useAutoplay";

const format = (ms: number) => {
  const seconds = ms / 1000;
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
};

/** A stopwatch. Before: proportional digits, so the time wobbles. After: tabular-nums holds it still.
 * It runs while on screen; the button pauses it. */
export function TabularNumbersDemo() {
  const { ref, playing } = useAutoplay();
  const [pressed, setPressed] = useState<boolean | null>(null);
  // It runs on its own while on screen, until the visitor presses play or pause.
  const running = pressed ?? playing;
  const [elapsed, setElapsed] = useState(11_480);
  useEffect(() => {
    if (!running) return;
    const start = performance.now() - elapsed;
    let frame = requestAnimationFrame(function tick(now) {
      setElapsed(now - start);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
    // `elapsed` seeds the start time once per run; re-running on every tick would reset it.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [running]);
  const watch = (tabular: boolean) => (
    <div className="stopwatch">
      <span className={`stopwatch__time${tabular ? " stopwatch__time--tabular" : ""}`}>
        {format(elapsed)}
      </span>
      <button
        type="button"
        className="icon-button"
        aria-label={running ? "Pause the stopwatch" : "Start the stopwatch"}
        onClick={() => setPressed(!running)}
      >
        {running ? <Pause aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}
      </button>
    </div>
  );
  return (
    <BeforeAfter
      ref={ref}
      title="Numbers that hold still"
      line="Every digit has its own width, so a typical timer jitters inside its frame."
      before={watch(false)}
      after={watch(true)}
    />
  );
}

"use client";

/**
 * The homepage "tune" toy: a corner button that opens a panel of dials which
 * retune the page's own tokens live. The panel loads on first open; leaving the
 * homepage puts every token back.
 */
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import { applyTune, TUNE_DEFAULT, type Tune } from "@/lib/tune";
import type { TunePanelProps } from "./TunePanel";

const TunePanel = lazy<ComponentType<TunePanelProps>>(() =>
  import("./TunePanel").catch(() => ({ default: () => null })),
);

export function TuneToy() {
  const [tune, setTune] = useState<Tune>(TUNE_DEFAULT);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => applyTune(document.documentElement, tune), [tune]);
  useEffect(() => () => applyTune(document.documentElement, TUNE_DEFAULT), []);

  return (
    <>
      <button
        ref={button}
        type="button"
        className="tune-button tune-exempt pressable"
        aria-label="Tune this page"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-open={open || undefined}
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
      >
        <span
          className="tune-swatch"
          data-on={tune.hue !== null || undefined}
          style={tune.hue === null ? undefined : ({ "--swatch-h": tune.hue } as CSSProperties)}
          aria-hidden
        />
        <span className="tune-button__label">
          <span aria-hidden>$ </span>tune
        </span>
        <span className="tune-button__cursor" aria-hidden>
          $_
        </span>
      </button>
      {loaded && (
        <Suspense fallback={null}>
          <TunePanel
            open={open}
            onOpenChange={setOpen}
            tune={tune}
            onTune={setTune}
            returnFocus={button}
          />
        </Suspense>
      )}
    </>
  );
}

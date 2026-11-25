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
import { scramble } from "@/lib/scramble";
import { applyTune, TUNE_DEFAULT, type Tune } from "@/lib/tune";
import type { TunePanelProps } from "./TunePanel";

/** If the panel can't load (offline, or a deploy replaced the chunk), give the button back. */
function PanelFailed({ onOpenChange }: TunePanelProps) {
  useEffect(() => onOpenChange(false), [onOpenChange]);
  return null;
}

const TunePanel = lazy<ComponentType<TunePanelProps>>(() =>
  import("./TunePanel").catch(() => ({ default: PanelFailed })),
);

export function TuneToy() {
  const [tune, setTune] = useState<Tune>(TUNE_DEFAULT);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dodge, setDodge] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => applyTune(document.documentElement, tune), [tune]);
  useEffect(() => () => applyTune(document.documentElement, TUNE_DEFAULT), []);
  // The corner button steps aside while the runner's controls pass under it.
  useEffect(() => {
    const foot = document.querySelector(".runner__foot");
    if (!foot) return;
    let frame = 0;
    const check = () => {
      frame = 0;
      const a = foot.getBoundingClientRect();
      const b = button.current?.getBoundingClientRect();
      const gap = 8;
      setDodge(
        !!b &&
          a.right + gap > b.left &&
          a.left - gap < b.right &&
          a.bottom + gap > b.top &&
          a.top - gap < b.bottom,
      );
    };
    const schedule = () => (frame ||= requestAnimationFrame(check));
    check();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, []);
  // A new typeface flips the text on screen into place, like a departures board.
  const shownType = useRef(tune.type);
  useEffect(() => {
    if (tune.type === shownType.current) return;
    shownType.current = tune.type;
    const page = document.querySelector(".page");
    return page ? scramble(page) : undefined;
  }, [tune.type]);

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
        data-dodge={dodge || undefined}
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

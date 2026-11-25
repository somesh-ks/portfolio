"use client";

/**
 * The homepage "tune" toy: a corner button that opens a panel of dials which
 * retune the page's own tokens live. The panel loads on first open; leaving the
 * homepage puts every token back.
 */
import {
  lazy,
  Suspense,
  useCallback,
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
  // The panel must mount closed to play its grow transition; until it has, the button stays.
  const [ready, setReady] = useState(false);
  const shown = open && ready;
  const button = useRef<HTMLButtonElement>(null);

  // The panel grows from the button's footprint and folds back onto it, so it needs
  // the button's size each time (a picked hue adds a swatch).
  const toggle = useCallback((next: boolean) => {
    const rect = button.current?.getBoundingClientRect();
    if (rect) {
      const root = document.documentElement.style;
      root.setProperty("--tune-from-w", `${rect.width}px`);
      root.setProperty("--tune-from-h", `${rect.height}px`);
    }
    setOpen(next);
  }, []);
  // Fetch the panel when the page is idle, or sooner on intent, so the first tap grows at once.
  const warm = () => setLoaded(true);
  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(() => setLoaded(true), { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(() => setLoaded(true), 1500);
    return () => clearTimeout(id);
  }, []);
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => applyTune(document.documentElement, tune), [tune]);
  useEffect(
    () => () => {
      const root = document.documentElement;
      applyTune(root, TUNE_DEFAULT);
      root.style.removeProperty("--tune-from-w");
      root.style.removeProperty("--tune-from-h");
    },
    [],
  );
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
        aria-expanded={shown}
        data-open={shown || undefined}
        onPointerEnter={warm}
        onPointerDown={warm}
        onFocus={warm}
        onClick={() => {
          setLoaded(true);
          toggle(true);
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
            open={shown}
            onOpenChange={toggle}
            onReady={onReady}
            tune={tune}
            onTune={setTune}
            returnFocus={button}
          />
        </Suspense>
      )}
    </>
  );
}

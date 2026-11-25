"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSound } from "@/components/providers/SoundProvider";

import { SEEDS } from "./brands";

interface LandingMotion {
  /** Advances every 3s while the page plays. */
  tick: number;
  seed: string;
  paused: boolean;
  reduced: boolean;
  setPaused: (p: boolean) => void;
  /** A brand the visitor picked; it holds until they pick another. */
  setPick: (hex: string) => void;
}

const Ctx = createContext<LandingMotion>({
  tick: 0,
  seed: SEEDS[0]!,
  paused: true,
  reduced: true,
  setPaused: () => {},
  setPick: () => {},
});

export const useLandingMotion = () => useContext(Ctx);

/** One clock for the page: the brand changes every 6s until the visitor picks one. */
export function LandingMotionProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [pick, setPick] = useState<string | null>(null);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const still = paused || reduced;
  useEffect(() => {
    if (still) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") setTick((n) => n + 1);
    }, 3000);
    return () => clearInterval(t);
  }, [still]);
  const seed = pick ?? SEEDS[Math.floor(tick / 2) % SEEDS.length]!;
  const value = useMemo(
    () => ({ tick, seed, paused: still, reduced, setPaused, setPick }),
    [tick, seed, still, reduced],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Pause or play everything that moves on the page (WCAG 2.2.2). */
export function PauseToggle() {
  const { paused, reduced, setPaused } = useLandingMotion();
  const { play } = useSound();
  if (reduced) return null;
  return (
    <button
      type="button"
      className="spring-landing__pause pressable"
      aria-label="Pause animations"
      aria-pressed={paused}
      onClick={() => {
        setPaused(!paused);
        play(paused ? "toggle" : "toggleOff");
      }}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor">
        {paused ? <path d="M5 3.5v9l7-4.5z" /> : <path d="M4.5 3.5h2.5v9H4.5zM9 3.5h2.5v9H9z" />}
      </svg>
    </button>
  );
}

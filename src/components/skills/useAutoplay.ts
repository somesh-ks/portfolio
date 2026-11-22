"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lets a skill example play itself: `playing` is true while the example is on
 * screen, until the visitor presses or types inside it (or calls `stop`), or
 * asks for reduced motion. Taking over is also the pause. Pass `ref` to the
 * example's root element.
 */
export function useAutoplay() {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [stopped, setStopped] = useState(false);
  useEffect(() => {
    if (!element || stopped) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stop = () => setStopped(true);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { threshold: 0.6 },
    );
    observer.observe(element);
    element.addEventListener("pointerdown", stop);
    element.addEventListener("keydown", stop);
    return () => {
      observer.disconnect();
      element.removeEventListener("pointerdown", stop);
      element.removeEventListener("keydown", stop);
    };
  }, [element, stopped]);
  return { ref: setElement, playing: visible && !stopped, stop: () => setStopped(true) };
}

/** Calls `tick` now and then every `ms` while `playing`. */
export function useEvery(playing: boolean, ms: number, tick: () => void) {
  const latest = useRef(tick);
  useEffect(() => {
    latest.current = tick;
  });
  useEffect(() => {
    if (!playing) return;
    latest.current();
    const id = setInterval(() => latest.current(), ms);
    return () => clearInterval(id);
  }, [playing, ms]);
}

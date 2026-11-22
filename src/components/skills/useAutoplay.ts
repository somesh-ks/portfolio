"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lets a skill example play itself. `visible` is true while the example is on
 * screen; `playing` adds that the visitor has not taken over (pressed or typed
 * inside it, or called `stop`) and does not ask for reduced motion, which is
 * re-read whenever the preference changes. Taking over is also the pause.
 * Pass `ref` to the example's root element.
 */
export function useAutoplay() {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { threshold: 0.6 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  useEffect(() => {
    if (!element || stopped) return;
    const stop = () => setStopped(true);
    element.addEventListener("pointerdown", stop);
    element.addEventListener("keydown", stop);
    return () => {
      element.removeEventListener("pointerdown", stop);
      element.removeEventListener("keydown", stop);
    };
  }, [element, stopped]);
  return {
    ref: setElement,
    visible,
    playing: visible && !stopped && !reduced,
    stop: () => setStopped(true),
  };
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

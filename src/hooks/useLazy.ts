"use client";

import { type PointerEvent, type RefObject, useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads a component off the hydration path: once the browser is idle, or
 * sooner when the visitor reaches for it (`load`). Until then it returns null
 * and the caller renders a plain element that looks the same. Swapping one for
 * the other remounts the trigger, so keyboard focus moves across via `ref`.
 * Spread `hover` on the stand-in: a mouse already resting on it when the code
 * arrives is reported as `hovered`, so the caller can open straight away
 * instead of waiting for the next mouse move.
 *
 * `loader` must be stable (a module-level function).
 */
export function useLazy<T>(
  loader: () => Promise<T>,
  ref: RefObject<HTMLElement | null>,
  when = true,
) {
  const [value, setValue] = useState<T | null>(null);
  const [hovered, setHovered] = useState(false);
  const started = useRef(false);
  const hadFocus = useRef(false);

  const load = useCallback(() => {
    if (started.current) return;
    started.current = true;
    void loader().then((loaded) => {
      hadFocus.current = document.activeElement === ref.current;
      setValue(() => loaded);
    });
  }, [loader, ref]);

  useEffect(() => {
    if (!when) return;
    // Safari has no requestIdleCallback; a short timeout stands in.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(load, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(load, 1500);
    return () => clearTimeout(timer);
  }, [when, load]);

  useEffect(() => {
    if (value && hadFocus.current) ref.current?.focus();
  }, [value, ref]);

  const hover = {
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType === "mouse") setHovered(true);
      load();
    },
    onPointerLeave: () => setHovered(false),
  };

  return { value, load, hovered, hover };
}

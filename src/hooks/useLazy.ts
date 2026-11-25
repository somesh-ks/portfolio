"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads a component off the hydration path: once the browser is idle, or
 * sooner when the visitor reaches for it (`load`). Until then it returns null
 * and the caller renders a plain element that looks the same.
 *
 * Swapping one for the other remounts the trigger at `ref`, so on arrival focus
 * moves across, and a mouse already resting on it is replayed as an enter, so
 * hover cards keep their usual delay instead of waiting for the next move.
 * A failed load (offline, a stale deploy) can be retried by the next reach.
 *
 * `loader` must be stable (a module-level function).
 */
export function useLazy<T>(
  loader: () => Promise<T>,
  ref: RefObject<HTMLElement | null>,
  when = true,
): [T | null, () => void] {
  const [value, setValue] = useState<T | null>(null);
  const started = useRef(false);
  const hadFocus = useRef(false);

  const load = useCallback(() => {
    if (started.current) return;
    started.current = true;
    loader().then(
      (loaded) => {
        hadFocus.current = document.activeElement === ref.current;
        setValue(() => loaded);
      },
      () => {
        started.current = false;
      },
    );
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
    const el = ref.current;
    if (!value || !el) return;
    if (hadFocus.current) el.focus();
    if (el.matches(":hover")) {
      el.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
      el.dispatchEvent(new MouseEvent("mouseenter"));
      el.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    }
  }, [value, ref]);

  return [value, load];
}

"use client";

import { useSyncExternalStore } from "react";

/** Server and first client render return `fallback`, so hydration matches. */
export function useMediaQuery(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

export const FINE_HOVER = "(hover: hover) and (pointer: fine)";

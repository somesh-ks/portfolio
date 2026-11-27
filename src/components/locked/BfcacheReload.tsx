"use client";

import { useEffect } from "react";

/** Reloads the page when Back restores it from the back-forward cache, so
 * after Lock the server decides again instead of the browser replaying the
 * unlocked body. */
export function BfcacheReload() {
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) location.reload();
    };
    addEventListener("pageshow", onShow);
    return () => removeEventListener("pageshow", onShow);
  }, []);
  return null;
}

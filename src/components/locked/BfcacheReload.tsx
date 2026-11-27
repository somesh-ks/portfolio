"use client";

import { useEffect } from "react";

/** After Lock is pressed, Back can restore the unlocked page from the
 * back-forward cache. Reload it then, so the server decides again. Pages
 * restored without a Lock (an outside link and back) are left alone. */
export function BfcacheReload() {
  useEffect(() => {
    let locked = false;
    const onSubmit = (event: SubmitEvent) => {
      if ((event.target as Element | null)?.closest(".lock-again")) locked = true;
    };
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted && locked) location.reload();
    };
    addEventListener("submit", onSubmit);
    addEventListener("pageshow", onShow);
    return () => {
      removeEventListener("submit", onSubmit);
      removeEventListener("pageshow", onShow);
    };
  }, []);
  return null;
}

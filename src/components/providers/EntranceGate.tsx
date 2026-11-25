"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

/** The whole entrance has settled by then, counted from navigation start. */
const SETTLED_MS = 1000;

const done = () => {
  document.documentElement.dataset.entered = "";
};

/** Plays the first-load entrance once. It closes a second after the page started loading, or on the
 *  first client navigation (before the new page paints), so anything that mounts
 *  later, or a page reached in-app, just appears. */
export function EntranceGate() {
  const path = usePathname();
  const first = useRef(path);
  useEffect(() => {
    // Counted from navigation start, so a slow hydration closes it at once.
    const timer = setTimeout(done, Math.max(0, SETTLED_MS - performance.now()));
    return () => clearTimeout(timer);
  }, []);
  useLayoutEffect(() => {
    if (path !== first.current) done();
  }, [path]);
  return null;
}

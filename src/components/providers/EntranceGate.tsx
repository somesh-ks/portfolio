"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

const done = () => {
  document.documentElement.dataset.entered = "";
};

/** Plays the first-load entrance once. It closes after the first second, or on the
 *  first client navigation (before the new page paints), so anything that mounts
 *  later, or a page reached in-app, just appears. */
export function EntranceGate() {
  const path = usePathname();
  const first = useRef(path);
  useEffect(() => {
    const timer = setTimeout(done, 1000);
    return () => clearTimeout(timer);
  }, []);
  useLayoutEffect(() => {
    if (path !== first.current) done();
  }, [path]);
  return null;
}

"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/** The fixed top bar. Hidden at the top of the page so the hero stays uncluttered;
 * once a fixed-length sentinel (about the hero's height) scrolls away it slides in
 * (`data-shown`). Cmd+K / Ctrl+K works either way. */
export function SiteBar({ children }: { children: ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setShown(!entry?.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} className="site-bar__sentinel" aria-hidden="true" />
      <header className="site-bar" data-shown={shown || undefined}>
        <div className="site-bar__row">{children}</div>
      </header>
    </>
  );
}

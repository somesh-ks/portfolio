"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/** The fixed top bar. Clear at the top of the page; once a fixed-length sentinel
 * (about the hero's height) scrolls out of view it gets a canvas fill and a hairline,
 * and the mark fades in. CSS draws and animates both states from `data-stuck`. */
export function SiteBar({ children }: { children: ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry?.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} className="site-bar__sentinel" aria-hidden="true" />
      <header className="site-bar" data-stuck={stuck || undefined}>
        <div className="site-bar__row">{children}</div>
      </header>
    </>
  );
}

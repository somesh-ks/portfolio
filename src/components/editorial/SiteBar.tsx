"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/** The fixed top bar. Clear at the very top. As soon as the page scrolls it gets a
 * canvas fill and a hairline (so text never slides under a clear "> jump"), and once
 * the hero (a fixed-length sentinel) is gone the mark fades in. CSS draws both states
 * from `data-filled` and `data-stuck`. */
export function SiteBar({ children }: { children: ReactNode }) {
  const top = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === top.current) setFilled(!entry.isIntersecting);
        if (entry.target === hero.current) setStuck(!entry.isIntersecting);
      }
    });
    for (const node of [top.current, hero.current]) if (node) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={top} className="site-bar__sentinel" data-at="top" aria-hidden="true" />
      <div ref={hero} className="site-bar__sentinel" data-at="hero" aria-hidden="true" />
      <header
        className="site-bar"
        data-filled={filled || stuck || undefined}
        data-stuck={stuck || undefined}
      >
        <div className="site-bar__row">{children}</div>
      </header>
    </>
  );
}

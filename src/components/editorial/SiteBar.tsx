"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/** The fixed top bar. Clear at the very top; as soon as the page scrolls it gets a
 * canvas fill and a hairline (`data-filled`), so text never slides under it. */
export function SiteBar({ children }: { children: ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setFilled(!entry?.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} className="site-bar__sentinel" aria-hidden="true" />
      <header className="site-bar" data-filled={filled || undefined}>
        <div className="site-bar__row">{children}</div>
      </header>
    </>
  );
}

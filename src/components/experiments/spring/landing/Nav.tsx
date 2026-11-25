"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PauseToggle } from "./Motion";

export const GITHUB = "https://github.com/somesh-ks/portfolio/tree/main/src/lib/spring";

/**
 * The bar with the ask appears only once the page's own "Open Spring" buttons are out of
 * view, so one call to action shows at a time.
 */
export function ScrollNav() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const ctas = document.querySelectorAll("[data-spring-cta]");
    const seen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) seen.add(e.target);
        else seen.delete(e.target);
      }
      setShown(seen.size === 0);
    });
    for (const c of ctas) io.observe(c);
    return () => io.disconnect();
  }, []);
  return (
    <header className="spring-nav" data-theme="dark" data-shown={shown} inert={!shown}>
      <Link href="/spring" className="spring-mark" aria-label="Spring home">
        spring
      </Link>
      <span className="spring-nav__end">
        <a href={GITHUB} className="spring-nav__link">
          GitHub
        </a>
        <PauseToggle />
        <Link href="/spring/app" className="spring-btn spring-btn--sm pressable">
          Open Spring
        </Link>
      </span>
    </header>
  );
}

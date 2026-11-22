"use client";

import { useEffect, useRef, useState } from "react";

type Section = { id: string; text: string };

/**
 * Sticky "On this page" rail for long entries. It reads the rendered h2s
 * (ids come from rehypeHeadingIds), so it needs no second parse of the MDX.
 * Renders nothing on the server and below two sections; CSS hides it on
 * screens too narrow for a side rail.
 */
export function ArticleOutline() {
  const ref = useRef<HTMLElement>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [active, setActive] = useState<string>();

  useEffect(() => {
    const prose = ref.current?.parentElement?.querySelector(".prose");
    if (!prose) return;
    const headings = [...prose.querySelectorAll<HTMLHeadingElement>(":scope > h2[id]")];
    if (headings.length < 2) return;
    setSections(headings.map((h) => ({ id: h.id, text: h.textContent ?? "" })));

    let frame = 0;
    const update = () => {
      frame = 0;
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const line = window.innerHeight * 0.3;
      let current: string | undefined;
      for (const h of headings) {
        if (h.getBoundingClientRect().top <= line) current = h.id;
      }
      setActive(atBottom ? headings.at(-1)?.id : current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <nav ref={ref} aria-label="On this page" className="toc" hidden={!sections.length}>
      <div className="toc__inner">
        <p className="toc__title">On this page</p>
        <ol className="toc__list">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="toc__link"
                aria-current={active === s.id ? "location" : undefined}
              >
                {s.text}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

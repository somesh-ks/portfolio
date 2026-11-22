"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { BeforeAfter } from "./BeforeAfter";
import { useAutoplay, useEvery } from "./useAutoplay";

/** Copy to check. Before: the icon pops. After: both icons share a cell and cross-fade with scale and blur. */
export function IconSwapDemo() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setDone(false), 1500);
    return () => clearTimeout(id);
  }, [done]);
  const press = () => setDone(true);
  const { ref, playing } = useAutoplay();
  useEvery(playing, 2400, press);
  const button = (smooth: boolean) => (
    <div className="share-field">
      someshks.com/skills
      <button
        type="button"
        className="icon-button icon-swap"
        aria-label={done ? "Copied" : "Copy"}
        data-sound="none"
        onClick={press}
      >
        {smooth ? (
          <span className="icon-swap__cell" aria-hidden="true">
            <Copy size={18} strokeWidth={1.75} data-visible={!done} />
            <Check size={18} strokeWidth={2} data-visible={done} className="icon-swap__check" />
          </span>
        ) : done ? (
          <Check aria-hidden="true" size={18} strokeWidth={2} className="icon-swap__check" />
        ) : (
          <Copy aria-hidden="true" size={18} strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
  return (
    <BeforeAfter
      ref={ref}
      title="Icons that swap smoothly"
      line="A typical check pops in. With the skill, it blurs and scales into place."
      before={button(false)}
      after={button(true)}
    />
  );
}

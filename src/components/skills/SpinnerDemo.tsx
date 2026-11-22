"use client";

import { BeforeAfter } from "./BeforeAfter";
import { useAutoplay } from "./useAutoplay";

/** The loader arc with a dot on its true centre. The dot only stays put when the spin pivots there. */
function Arc() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" className="spinner-demo__track" strokeWidth="1.75" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        className="spinner-demo__arc"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="1.5" className="spinner-demo__dot" />
    </svg>
  );
}

/**
 * A spinner turns around the centre of the box that carries the animation.
 * Before: the spin sits on an inline-block wrapper, which the line box makes
 * taller than the icon, so the arc orbits a point below its own centre.
 * After: the wrapper is an inline-grid that hugs the icon.
 */
const spinner = (centred: boolean) => (
  <p className="spinner-demo">
    <span className={`spinner-demo__wrap spinner-demo__wrap--${centred ? "grid" : "inline"}`}>
      <Arc />
    </span>
    Loading
  </p>
);

export function SpinnerDemo() {
  // Spins only while on screen; reduced motion slows it in CSS instead of stopping it.
  const { ref, visible } = useAutoplay();
  return (
    <BeforeAfter
      ref={ref}
      data-paused={!visible}
      title="Spinners that spin true"
      line="Watch the centre dot: a typical spinner circles a point below its middle."
      before={spinner(false)}
      after={spinner(true)}
    />
  );
}

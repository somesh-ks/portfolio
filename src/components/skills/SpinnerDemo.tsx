"use client";

import { LoaderCircle } from "lucide-react";
import { BeforeAfter } from "./BeforeAfter";

/**
 * A spinner turns around the centre of the box that carries the animation.
 * Before: the spin sits on an inline-block wrapper, which the line box makes
 * taller than the icon, so the arc orbits a point below its own centre.
 * After: the wrapper is an inline-grid that hugs the icon.
 */
const spinner = (centred: boolean) => (
  <p className="spinner-demo">
    <span className={`spinner-demo__wrap spinner-demo__wrap--${centred ? "grid" : "inline"}`}>
      <LoaderCircle aria-hidden="true" size={28} strokeWidth={1.75} />
    </span>
    Loading
  </p>
);

export function SpinnerDemo() {
  return (
    <BeforeAfter
      title="Spinners that spin true"
      line="Before, the spinner wobbles off its center."
      before={spinner(false)}
      after={spinner(true)}
    />
  );
}

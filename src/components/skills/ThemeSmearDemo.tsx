"use client";

import { Contrast } from "lucide-react";
import { useState } from "react";
import { DemoFrame, type DemoMode } from "./DemoFrame";

/** A mini card that flips to the opposite of the site theme. Typical: every colour transitions at its own speed.
 * Fixed: transitions are suspended for the flip and restored after two frames. */
export function ThemeSmearDemo() {
  const [mode, setMode] = useState<DemoMode>("typical");
  const [flipped, setFlipped] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const flip = () => {
    if (mode === "typical") {
      setFlipped((value) => !value);
      return;
    }
    setSuspended(true);
    setFlipped((value) => !value);
    requestAnimationFrame(() => requestAnimationFrame(() => setSuspended(false)));
  };
  return (
    <DemoFrame
      label="Theme switch version"
      mode={mode}
      onMode={setMode}
      caption={{
        typical:
          "Toggle the theme. Each element has its own colour transition, so background, text and borders arrive at different times and the card smears.",
        fixed:
          "Transitions are switched off for the flip and restored two frames later, so the new theme lands in one clean frame.",
      }}
    >
      <div
        className={`smear-card smear-card--${mode}${flipped ? " smear-card--flipped" : ""}${
          suspended ? " smear-card--suspended" : ""
        }`}
      >
        <div className="smear-card__head">
          <span className="smear-card__title">Weekly report</span>
          <button
            type="button"
            className="smear-card__toggle"
            onClick={flip}
            aria-label="Flip the card's theme"
            aria-pressed={flipped}
          >
            <Contrast aria-hidden="true" size={15} />
          </button>
        </div>
        <p className="smear-card__body">Signups grew 12% while churn held steady.</p>
        <div className="smear-card__chips">
          <span>Growth</span>
          <span>Retention</span>
        </div>
      </div>
    </DemoFrame>
  );
}

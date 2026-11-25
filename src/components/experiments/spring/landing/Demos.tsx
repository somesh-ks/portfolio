"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { BeforeAfter } from "./BeforeAfter";
import { Horizon, Install, scaleFor } from "./Hero";
import { useLandingMotion } from "./Motion";

const AUDIT = "npx skills add somesh-ks/skills --skill sk-design-sys";

/** For a system that already exists: the skill audits it, Spring rebuilds it. */
export function Audit() {
  return (
    <section id="existing" className="spring-audit" aria-labelledby="spring-audit-title">
      <div className="spring-audit__head">
        <h2 id="spring-audit-title">Already have a system? Audit it.</h2>
        <p>
          The design-sys skill reads your repo with your agent, names what drifted with its
          path:line, and rebuilds the foundations in Spring. Drag to compare.
        </p>
        <Install command={AUDIT} />
      </div>
      <BeforeAfter />
    </section>
  );
}

/** The last ask, over a strip of the horizon. */
export function Closing() {
  const { seed, paused } = useLandingMotion();
  const steps = useMemo(() => scaleFor(seed).dark.map((s) => s.hex), [seed]);
  return (
    <section className="spring-close" data-theme="dark" aria-labelledby="spring-close-title">
      <div className="spring-close__sky">
        <Horizon steps={steps} still={paused} />
      </div>
      <div className="spring-close__copy">
        <h2 id="spring-close-title">Start from one color.</h2>
        <Link href="/spring/app" className="spring-hero__primary pressable">
          Open Spring
        </Link>
      </div>
    </section>
  );
}

/** The app used to live at /spring, so its #audit link lands there; send it on. */
export function OldAppLinks() {
  useEffect(() => {
    if (location.hash === "#audit") location.replace("/spring/app#audit");
  }, []);
  return null;
}

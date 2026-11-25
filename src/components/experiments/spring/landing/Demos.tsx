"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { BrandData } from "./data";
import { Horizon, horizonFor } from "./Hero";
import { useLandingMotion } from "./Motion";

/** The last ask, over a strip of the horizon. */
export function Closing({ brands }: { brands: BrandData[] }) {
  const { seed, paused } = useLandingMotion();
  const steps = horizonFor(brands, seed);
  return (
    <section className="spring-close" data-theme="dark" aria-labelledby="spring-close-title">
      <div className="spring-close__sky">
        <Horizon steps={steps} still={paused} />
      </div>
      <div className="spring-close__copy">
        <h2 id="spring-close-title" className="spring-h2">
          Try yours.
        </h2>
        <Link href="/spring/app" className="spring-btn pressable" data-spring-cta>
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

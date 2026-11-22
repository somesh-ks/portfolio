"use client";

/**
 * Recreation of the white-label idea with fictional banks: three token tiers
 * (brand primitives -> semantic roles -> card component). A theme switch only
 * swaps the brand tier, so the card re-themes in one style recalculation.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Segmented } from "@/components/experiments/Segmented";
import { useSound } from "@/components/providers/SoundProvider";

const BRANDS = {
  fjord: { name: "Fjordbank", hue: 230, chroma: 0.11, radius: "14px", font: "var(--font-sans)" },
  kronberg: {
    name: "Kronberg Privat",
    hue: 150,
    chroma: 0.07,
    radius: "4px",
    font: "var(--font-serif)",
  },
  aurora: {
    name: "Aurora Sparbank",
    hue: 20,
    chroma: 0.14,
    radius: "20px",
    font: "var(--font-sans)",
  },
  nordwald: { name: "Nordwald", hue: 285, chroma: 0.1, radius: "10px", font: "var(--font-mono)" },
} as const;
type BrandId = keyof typeof BRANDS;
const VIEWS = ["investor", "partner"] as const;
type View = (typeof VIEWS)[number];

function brandStyle(id: BrandId): CSSProperties {
  const brand = BRANDS[id];
  // Brand tier only. Semantic and component tiers live in CSS and never change.
  return {
    "--brand-hue": brand.hue,
    "--brand-chroma": brand.chroma,
    "--brand-radius": brand.radius,
    "--brand-font": brand.font,
  } as CSSProperties;
}

export function RoycWhiteLabelSwitcher() {
  const [brand, setBrand] = useState<BrandId>("fjord");
  const [view, setView] = useState<View>("investor");
  const [elapsed, setElapsed] = useState<number | null>(null);
  const started = useRef(0);
  const card = useRef<HTMLDivElement>(null);
  const { play } = useSound();

  // Measure after each brand commit; `brand` is the trigger, not a value read here.
  // oxlint-disable-next-line react/exhaustive-deps
  useLayoutEffect(() => {
    if (!started.current || !card.current) return;
    // Force style + layout so the number covers the real re-theme cost.
    card.current.getBoundingClientRect();
    setElapsed(performance.now() - started.current);
    started.current = 0;
  }, [brand]);

  return (
    <figure className="toy white-label">
      <div className="toy__bar">
        <Segmented
          label="Bank theme"
          options={Object.keys(BRANDS) as BrandId[]}
          value={brand}
          onChange={(next) => {
            started.current = performance.now();
            setBrand(next);
            play("tick");
          }}
          render={(option) => BRANDS[option].name}
        />
        <Segmented
          label="Portal"
          options={VIEWS}
          value={view}
          onChange={setView}
          render={(option) => (option === "investor" ? "Investor" : "Partner")}
        />
      </div>
      <div ref={card} className="white-label__stage" style={brandStyle(brand)}>
        <article className="wl-card">
          <header className="wl-card__head">
            <span className="wl-card__logo" aria-hidden="true" />
            <span className="wl-card__bank">{BRANDS[brand].name}</span>
            <span className="wl-card__pill">{view === "investor" ? "Investor" : "Partner"}</span>
          </header>
          {view === "investor" ? (
            <>
              <p className="wl-card__label">Nordic Infrastructure Fund III</p>
              <p className="wl-card__value tabular">EUR 250,000</p>
              <p className="wl-card__sub">Committed · 62% called</p>
              <div className="wl-card__bar" aria-hidden="true">
                <span style={{ width: "62%" }} />
              </div>
              <span className="wl-card__cta">View capital calls</span>
            </>
          ) : (
            <>
              <p className="wl-card__label">Clients awaiting KYC</p>
              <p className="wl-card__value tabular">14</p>
              <p className="wl-card__sub">3 due this week · 2 flagged</p>
              <div className="wl-card__bar" aria-hidden="true">
                <span style={{ width: "21%" }} />
              </div>
              <span className="wl-card__cta">Review onboarding</span>
            </>
          )}
        </article>
      </div>
      <figcaption className="toy__caption" aria-live="polite">
        {elapsed === null
          ? "Fictional banks. Switch theme to re-skin the card through the brand token tier."
          : `${BRANDS[brand].name} applied in ${elapsed.toFixed(1)} ms, one style recalculation.`}
      </figcaption>
    </figure>
  );
}

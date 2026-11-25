"use client";

/**
 * Inline company name that reveals a preview card. The card's Base UI code
 * (CompanyPreviewCard) loads once the page is idle; until then this renders the
 * same pill, and reaching for it (hover, focus or a tap) loads it at once.
 * A tap before it arrives opens the card as soon as it does.
 */
import { type ReactNode, useEffect, useRef } from "react";
import type { Company } from "@content/profile";
import { useLazy } from "@/hooks/useLazy";

const loadCard = () => import("./hover-cards").then((m) => m.CompanyPreviewCard);

export function CompanyPreview({
  company,
  thumbnail,
  logo,
}: {
  company: Company;
  thumbnail: boolean;
  /** Inline SVG from CompanyLogo, rendered on the server; null when none. */
  logo: ReactNode;
}) {
  const pill = useRef<HTMLButtonElement>(null);
  const tapped = useRef(false);
  const [Card, load] = useLazy(loadCard, pill);
  // A tap or click before the card arrived is replayed on the real trigger,
  // so the card opens just as a click would open it.
  useEffect(() => {
    if (Card && tapped.current) pill.current?.click();
  }, [Card]);
  if (Card) return <Card ref={pill} company={company} thumbnail={thumbnail} logo={logo} />;
  const warm = () => {
    if (thumbnail) new window.Image().src = `/previews/${company.id}.webp`;
  };
  return (
    <button
      ref={pill}
      type="button"
      aria-haspopup="dialog"
      aria-expanded="false"
      className="company-pill pressable"
      onPointerEnter={() => {
        warm();
        load();
      }}
      onFocus={() => {
        warm();
        load();
      }}
      onClick={() => {
        tapped.current = true;
        warm();
        load();
      }}
    >
      {logo}
      {company.name}
    </button>
  );
}

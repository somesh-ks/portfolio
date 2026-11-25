"use client";

/**
 * Inline company name that reveals a preview card. The card's Base UI code
 * (CompanyPreviewCard) loads once the page is idle; until then this renders the
 * same pill, and reaching for it (hover, focus or a tap) loads it at once.
 * A tap, or a mouse resting on the pill, before it arrives opens the card as
 * soon as it does.
 */
import { type ReactNode, useRef, useState } from "react";
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
  const [tapped, setTapped] = useState(false);
  const { value: Card, load, hovered, hover } = useLazy(loadCard, pill);
  if (Card)
    return (
      <Card
        ref={pill}
        defaultOpen={tapped || hovered}
        company={company}
        thumbnail={thumbnail}
        logo={logo}
      />
    );
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
      {...hover}
      onPointerEnter={(event) => {
        warm();
        hover.onPointerEnter(event);
      }}
      onFocus={() => {
        warm();
        load();
      }}
      onClick={() => {
        setTapped(true);
        warm();
        load();
      }}
    >
      {logo}
      {company.name}
    </button>
  );
}

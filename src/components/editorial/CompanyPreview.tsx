"use client";

/**
 * Inline company name that reveals a preview card.
 * Fine pointers: opens on hover after a short intent delay.
 * Touch and keyboard: the same trigger is a button, so a tap or Enter opens
 * it and a second tap, Escape or a tap outside closes it. No sticky hover.
 */
import { Popover } from "@base-ui/react/popover";
import Image from "next/image";
import type { Company } from "@content/profile";
import { FINE_HOVER, useMediaQuery } from "@/hooks/useMediaQuery";

export function CompanyPreview({
  company,
  thumbnail,
  logo,
}: {
  company: Company;
  thumbnail: boolean;
  /** Draws the mark from the page's LogoSprite. */
  logo: boolean;
}) {
  const fineHover = useMediaQuery(FINE_HOVER);
  // The card's image only mounts when the popover opens. Start the fetch on
  // hover or focus so the open delay covers it.
  const warm = thumbnail
    ? () => {
        new window.Image().src = `/previews/${company.id}.webp`;
      }
    : undefined;
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover={fineHover}
        delay={180}
        closeDelay={120}
        className="company-pill pressable"
        onPointerEnter={warm}
        onFocus={warm}
      >
        {logo ? (
          <svg
            aria-hidden="true"
            focusable="false"
            fill="currentColor"
            className="company-pill__logo"
          >
            <use href={`#logo-${company.id}`} />
          </svg>
        ) : null}
        {company.name}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" sideOffset={8} collisionPadding={16} className="z-50">
          <Popover.Popup className="company-card">
            {thumbnail ? (
              <Image
                src={`/previews/${company.id}.webp`}
                alt=""
                width={560}
                height={350}
                sizes="240px"
                unoptimized
                className="company-card__thumb"
              />
            ) : null}
            <Popover.Title className="company-card__name">{company.name}</Popover.Title>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

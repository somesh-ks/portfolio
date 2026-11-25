"use client";

/**
 * The Base UI half of CompanyPreview, loaded after hydration. Fine pointers
 * open it on hover after a short intent delay; a tap or Enter opens it, and a
 * second tap, Escape or a tap outside closes it.
 */
import { Popover } from "@base-ui/react/popover";
import Image from "next/image";
import type { ReactNode, Ref } from "react";
import type { Company } from "@content/profile";
import { FINE_HOVER, useMediaQuery } from "@/hooks/useMediaQuery";

export function CompanyPreviewCard({
  ref,
  company,
  thumbnail,
  logo,
}: {
  ref: Ref<HTMLButtonElement>;
  company: Company;
  thumbnail: boolean;
  /** Inline SVG from CompanyLogo, rendered on the server; null when none. */
  logo: ReactNode;
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
        ref={ref}
        openOnHover={fineHover}
        delay={180}
        closeDelay={120}
        className="company-pill pressable"
        onPointerEnter={warm}
        onFocus={warm}
      >
        {logo}
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

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
  logo: boolean;
}) {
  const fineHover = useMediaQuery(FINE_HOVER);
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover={fineHover}
        delay={180}
        closeDelay={120}
        className="company-pill pressable"
      >
        {logo ? (
          <Image
            src={`/logos/${company.id}.webp`}
            alt=""
            width={32}
            height={32}
            className="company-pill__logo"
          />
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
                sizes="272px"
                className="company-card__thumb"
              />
            ) : null}
            <div className="company-card__body">
              <Popover.Title className="company-card__name">{company.name}</Popover.Title>
              <Popover.Description className="company-card__about">
                {company.about}
              </Popover.Description>
              <p className="company-card__relation">{company.relation}</p>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

"use client";

/**
 * A footer link that shows a preview card on mouse hover or keyboard focus.
 * The trigger stays a plain link: a tap on touch just follows it, so nothing
 * opens without a fine pointer. The card is decoration, never interactive.
 */
import { PreviewCard } from "@base-ui/react/preview-card";
import type { ReactNode } from "react";
import { FINE_HOVER, useMediaQuery } from "@/hooks/useMediaQuery";

export function ContactPreview({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  /** The card body, rendered on the server. */
  children: ReactNode;
}) {
  const fineHover = useMediaQuery(FINE_HOVER);
  const link = { href, className: "link", rel: "me noopener", target: "_blank" } as const;
  if (!fineHover) return <a {...link}>{label}</a>;
  return (
    <PreviewCard.Root>
      <PreviewCard.Trigger {...link} delay={180} closeDelay={120}>
        {label}
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner side="top" sideOffset={8} collisionPadding={16} className="z-50">
          <PreviewCard.Popup className="company-card contact-card" aria-hidden="true">
            {children}
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}

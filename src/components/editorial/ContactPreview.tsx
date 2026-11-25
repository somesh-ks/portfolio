"use client";

/**
 * A footer link that shows a preview card on mouse hover or keyboard focus.
 * The trigger stays a plain link: a tap on touch just follows it, so nothing
 * opens without a fine pointer. The card is decoration, never interactive.
 */
import { PreviewCard } from "@base-ui/react/preview-card";
import { useState, type ReactNode } from "react";
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
  const [open, setOpen] = useState(false);
  // Same anchor on every device (no remount after hydration); it just never opens without a fine pointer.
  return (
    <PreviewCard.Root open={open && fineHover} onOpenChange={(next) => setOpen(next && fineHover)}>
      <PreviewCard.Trigger
        href={href}
        className="link"
        rel="me noopener"
        target="_blank"
        delay={180}
        closeDelay={120}
      >
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

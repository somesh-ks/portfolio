"use client";

/**
 * The Base UI half of ContactPreview, loaded after hydration. The card is
 * decoration, never interactive, and never opens without a fine pointer.
 */
import { PreviewCard } from "@base-ui/react/preview-card";
import { type ReactNode, type Ref, useState } from "react";
import { FINE_HOVER, useMediaQuery } from "@/hooks/useMediaQuery";

export function ContactPreviewCard({
  ref,
  href,
  label,
  children,
}: {
  ref: Ref<HTMLAnchorElement>;
  href: string;
  label: string;
  /** The card body, rendered on the server. */
  children: ReactNode;
}) {
  const fineHover = useMediaQuery(FINE_HOVER);
  const [open, setOpen] = useState(false);
  // It never opens without a fine pointer. (ContactPreview swaps this in for a plain link; useLazy carries focus and hover across.)
  return (
    <PreviewCard.Root open={open && fineHover} onOpenChange={(next) => setOpen(next && fineHover)}>
      <PreviewCard.Trigger
        ref={ref}
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

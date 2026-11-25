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
  defaultOpen,
  href,
  label,
  children,
}: {
  ref: Ref<HTMLAnchorElement>;
  /** Open on mount: the mouse was already resting on the link when this loaded. */
  defaultOpen: boolean;
  href: string;
  label: string;
  /** The card body, rendered on the server. */
  children: ReactNode;
}) {
  const fineHover = useMediaQuery(FINE_HOVER);
  const [open, setOpen] = useState(defaultOpen);
  // Same anchor on every device (no remount after hydration); it just never opens without a fine pointer.
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

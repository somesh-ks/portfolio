"use client";

/**
 * A footer link that shows a preview card on mouse hover or keyboard focus.
 * The trigger stays a plain link: a tap on touch just follows it, so nothing
 * opens without a fine pointer. With one, ContactPreviewCard loads once the page
 * is idle, or at once on hover or focus. It shares a chunk with the other hover
 * cards, so floating-ui ships once.
 */
import { type ReactNode, useRef } from "react";
import { FINE_HOVER, useMediaQuery } from "@/hooks/useMediaQuery";
import { useLazy } from "@/hooks/useLazy";

const loadCard = () => import("./hover-cards").then((m) => m.ContactPreviewCard);

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
  const link = useRef<HTMLAnchorElement>(null);
  const [Card, load] = useLazy(loadCard, link, fineHover);
  if (Card)
    return (
      <Card ref={link} href={href} label={label}>
        {children}
      </Card>
    );
  return (
    <a
      ref={link}
      href={href}
      className="link"
      rel="me noopener"
      target="_blank"
      {...(fineHover ? { onPointerEnter: load, onFocus: load } : {})}
    >
      {label}
    </a>
  );
}

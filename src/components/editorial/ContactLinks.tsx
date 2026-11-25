import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ContactPreview } from "@/components/editorial/ContactPreview";
import { CopyEmail } from "@/components/editorial/CopyEmail";

type ContactLink = { label: string; href: string };

/** One row of mono caps links. Pages use Link; mailto copies the address (CopyEmail); files stay plain anchors; external links open in a new tab with rel="me", with a hover preview when `previews` has one. */
export function ContactLinks({
  links,
  label,
  previews,
}: {
  links: ContactLink[];
  label: string;
  /** Preview card bodies by href; those links open a ContactPreview on hover or focus. */
  previews?: Record<string, ReactNode>;
}) {
  return (
    <nav aria-label={label} className="contact-links">
      {links.map((link) =>
        link.href.startsWith("mailto:") ? (
          <CopyEmail key={link.href} email={link.href.slice(7)} label={link.label} />
        ) : link.href.startsWith("/") && !link.href.includes(".") ? (
          <Link key={link.href} href={link.href as Route} className="link">
            {link.label}
          </Link>
        ) : previews?.[link.href] ? (
          <ContactPreview key={link.href} href={link.href} label={link.label}>
            {previews[link.href]}
          </ContactPreview>
        ) : link.href.startsWith("http") ? (
          <a key={link.href} href={link.href} className="link" rel="me noopener" target="_blank">
            {link.label}
          </a>
        ) : (
          <a key={link.href} href={link.href} className="link">
            {link.label}
          </a>
        ),
      )}
    </nav>
  );
}

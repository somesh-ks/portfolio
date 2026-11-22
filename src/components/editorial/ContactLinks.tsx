import type { Route } from "next";
import Link from "next/link";
import { CopyEmail } from "@/components/editorial/CopyEmail";

type ContactLink = { label: string; href: string };

/** One row of mono caps links. Pages use Link; mailto copies the address (CopyEmail); files stay plain anchors; external links open in a new tab with rel="me". */
export function ContactLinks({ links, label }: { links: ContactLink[]; label: string }) {
  return (
    <nav aria-label={label} className="contact-links">
      {links.map((link) =>
        link.href.startsWith("mailto:") ? (
          <CopyEmail key={link.href} email={link.href.slice(7)} label={link.label} />
        ) : link.href.startsWith("/") && !link.href.includes(".") ? (
          <Link key={link.href} href={link.href as Route} className="link">
            {link.label}
          </Link>
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

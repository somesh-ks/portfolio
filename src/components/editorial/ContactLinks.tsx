import type { Route } from "next";
import Link from "next/link";

type ContactLink = { label: string; href: string };

/** One row of mono caps links. External links open in a new tab and carry rel="me". */
export function ContactLinks({ links, label }: { links: ContactLink[]; label: string }) {
  return (
    <nav aria-label={label} className="contact-links">
      {links.map((link) =>
        link.href.startsWith("/") ? (
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

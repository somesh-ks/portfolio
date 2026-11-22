import type { Route } from "next";
import Link from "next/link";
import { PROFILE } from "@content/profile";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav aria-label="Elsewhere" className="site-footer__links">
        {PROFILE.links.map((link) =>
          link.href.startsWith("http") ? (
            <a key={link.href} href={link.href} className="link" rel="me noopener" target="_blank">
              {link.label}
            </a>
          ) : (
            <Link key={link.href} href={link.href as Route} className="link">
              {link.label}
            </Link>
          ),
        )}
        {/* oxlint-disable-next-line nextjs/no-html-link-for-pages -- llms.txt is a text file, not a page */}
        <a href="/llms.txt" className="link">
          For AI agents
        </a>
      </nav>
      <div className="site-footer__end">
        <p className="site-footer__note">
          <Link href="/" className="link">
            {PROFILE.name}
          </Link>
          , Stockholm
        </p>
        <ThemeToggle />
      </div>
    </footer>
  );
}

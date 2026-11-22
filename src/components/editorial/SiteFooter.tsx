import { PROFILE } from "@content/profile";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function SiteFooter() {
  const links = PROFILE.links.filter((link) => link.label === "X");
  return (
    <footer className="site-footer">
      <p className="site-footer__note">{PROFILE.name} · Stockholm</p>
      <nav aria-label="Elsewhere" className="site-footer__links">
        {links.map((link) => (
          <a key={link.href} href={link.href} className="link" rel="me noopener" target="_blank">
            {link.label}
          </a>
        ))}
        {/* oxlint-disable-next-line nextjs/no-html-link-for-pages -- llms.txt is a text file, not a page */}
        <a href="/llms.txt" className="link">
          For AI agents
        </a>
        <ThemeToggle />
      </nav>
    </footer>
  );
}

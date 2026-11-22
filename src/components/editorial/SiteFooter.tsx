import { PROFILE } from "@content/profile";
import { ContactLinks } from "@/components/editorial/ContactLinks";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const LINKS = [...PROFILE.links, { label: "For AI agents", href: "/llms.txt" }];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <ContactLinks label="Elsewhere" links={LINKS} />
      <ThemeToggle />
    </footer>
  );
}

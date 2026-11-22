import { PROFILE } from "@content/profile";
import { ContactLinks } from "@/components/editorial/ContactLinks";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const LINKS = [...PROFILE.links, { label: "For AI agents", href: "/llms.txt" }];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <ContactLinks label="Elsewhere" links={LINKS} />
      <div className="site-footer__toggles">
        <ThemeToggle />
        <SoundToggle />
      </div>
    </footer>
  );
}

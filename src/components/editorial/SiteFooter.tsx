import { PROFILE } from "@content/profile";
import { GitHubCard } from "@/components/editorial/GitHubCard";
import { LinkedInCard } from "@/components/editorial/LinkedInCard";
import { ContactLinks } from "@/components/editorial/ContactLinks";
import { EasterEggs } from "@/components/ui/EasterEggs";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const LINKS = [...PROFILE.links, { label: "For AI agents", href: "/llms.txt" }];
const hrefOf = (label: string) => PROFILE.links.find((link) => link.label === label)?.href ?? "";
const PREVIEWS = {
  [hrefOf("LinkedIn")]: <LinkedInCard />,
  [hrefOf("GitHub")]: <GitHubCard />,
};

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <ContactLinks label="Elsewhere" links={LINKS} previews={PREVIEWS} />
      <div className="site-footer__toggles">
        <ThemeToggle />
        <SoundToggle />
      </div>
      <EasterEggs />
    </footer>
  );
}

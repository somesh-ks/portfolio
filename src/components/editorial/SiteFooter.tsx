import { PROFILE } from "@content/profile";
import { ContactLinks } from "@/components/editorial/ContactLinks";
import { CommandMenu } from "@/components/command/CommandMenu";
import type { CommandLink } from "@/components/command/items";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { entriesOf } from "@/lib/content";

const LINKS = [...PROFILE.links, { label: "For AI agents", href: "/llms.txt" }];

const GROUPS = [
  ["case-study", "Work"],
  ["project", "Projects"],
  ["experiment", "Experiments"],
] as const;

// Titles and paths only: they are already public on the homepage.
const COMMANDS: CommandLink[] = [
  { label: "Home", href: "/", group: "Pages" },
  { label: "Resume", href: "/resume", group: "Pages" },
  ...GROUPS.flatMap(([kind, group]) =>
    entriesOf(kind).map((entry) => ({ label: entry.meta.title, href: entry.href, group })),
  ),
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <ContactLinks label="Elsewhere" links={LINKS} />
      <div className="site-footer__tools">
        <CommandMenu links={COMMANDS} />
        <ThemeToggle />
      </div>
    </footer>
  );
}

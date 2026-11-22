import { CommandMenu } from "@/components/command/CommandMenu";
import type { CommandLink } from "@/components/command/items";
import { entriesOf } from "@/lib/content";

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

/** Sits in the page's top padding, so nothing below it moves. */
export function SiteHeader() {
  return (
    <header className="site-header">
      <CommandMenu links={COMMANDS} />
    </header>
  );
}

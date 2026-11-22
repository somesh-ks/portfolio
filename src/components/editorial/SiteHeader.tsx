import Link from "next/link";
import { CommandMenu } from "@/components/command/CommandMenu";
import type { CommandLink } from "@/components/command/items";
import { entriesOf } from "@/lib/content";
import { SITE_NAME } from "@/lib/site";
import { SiteBar } from "./SiteBar";

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

// The Geist Pixel SK from the favicon (public/favicon-*.svg), in the text colour.
const MARK =
  "M3 24V22H2V19H4V22H5V23H12V22H13V18H11V17H8V16H5V15H3V14H2V9H3V7H5V6H11V7H13V8H14V10H15V12H13V10H12V9H11V8H5V9H4V13H5V14H9V15H12V16H14V18H15V22H14V24H12V25H5V24ZM17 25V6H19V15H20V14H21V13H22V12H23V11H24V10H25V9H26V8H27V7H28V6H30V8H29V9H28V10H27V11H26V12H25V13H24V14H23V16H24V17H25V18H26V19H27V20H28V21H29V22H30V25H28V23H27V22H26V21H25V20H24V19H23V18H22V17H20V18H19V25Z";

/** Slim top bar: the SK mark (home) on the left, "> jump" on the right. */
export function SiteHeader() {
  return (
    <SiteBar>
      <Link href="/" className="site-bar__mark pressable" aria-label={`${SITE_NAME}, home`}>
        <svg viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true">
          <path fill="currentColor" d={MARK} />
        </svg>
      </Link>
      <CommandMenu links={COMMANDS} />
    </SiteBar>
  );
}

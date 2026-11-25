import { existsSync } from "node:fs";
import path from "node:path";
import { PROFILE } from "@content/profile";
import { Bio } from "@/components/editorial/Bio";
import { ListRow } from "@/components/editorial/ListRow";
import { ListSection } from "@/components/editorial/ListSection";
import { ClaudeRunner } from "@/components/runner/ClaudeRunner";
import { entriesOf } from "@/lib/content";
import type { Kind } from "@/lib/schema";

/** Row thumbnails come from scripts/capture-thumbs.ts; rows without one show none. */
function thumbFor(slug: string): string | undefined {
  const file = path.join(process.cwd(), "public", "thumbs", `${slug}.webp`);
  return existsSync(file) ? `/thumbs/${slug}.webp` : undefined;
}

const onHome = (kind: Kind) => entriesOf(kind).filter((entry) => entry.meta.home);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-20" to "Sep 2026". Fixed names, since ICU versions disagree on "Sep" vs "Sept". */
const monthYear = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

export default function HomePage() {
  return (
    <>
      <header className="intro">
        <h1 className="intro__name">{PROFILE.name}</h1>
        <p className="intro__role">Design engineer</p>
      </header>
      <Bio />
      <ClaudeRunner />
      <ListSection id="projects" title="Projects">
        {onHome("project").map((entry) => (
          <ListRow
            key={entry.href}
            href={entry.href}
            title={entry.meta.title}
            summary={entry.meta.summary}
            thumb={thumbFor(entry.meta.slug)}
          />
        ))}
      </ListSection>
      <ListSection id="experiments" title="Experiments">
        {onHome("experiment").map((entry) => (
          <ListRow
            key={entry.href}
            href={entry.href}
            title={entry.meta.title}
            summary={entry.meta.summary}
            thumb={thumbFor(entry.meta.slug)}
          />
        ))}
      </ListSection>
      <ListSection id="writing" title="Writing">
        {onHome("case-study").map((entry) => (
          <ListRow
            key={entry.href}
            href={entry.href}
            title={entry.meta.title}
            summary={monthYear(entry.meta.publishedAt)}
            thumb={thumbFor(entry.meta.slug)}
            locked={entry.meta.protected}
          />
        ))}
      </ListSection>
    </>
  );
}

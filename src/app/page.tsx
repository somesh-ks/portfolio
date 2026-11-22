import { existsSync } from "node:fs";
import path from "node:path";
import { PROFILE } from "@content/profile";
import { Bio } from "@/components/editorial/Bio";
import { ListRow } from "@/components/editorial/ListRow";
import { ListSection } from "@/components/editorial/ListSection";
import { ClaudeRunner } from "@/components/runner/ClaudeRunner";
import { entriesOf } from "@/lib/content";

/** Row thumbnails come from scripts/capture-thumbs.ts; rows without one show none. */
function thumbFor(slug: string): string | undefined {
  const file = path.join(process.cwd(), "public", "thumbs", `${slug}.webp`);
  return existsSync(file) ? `/thumbs/${slug}.webp` : undefined;
}

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
        {entriesOf("project").map((entry) => (
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
        {entriesOf("experiment").map((entry) => (
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
        {entriesOf("case-study").map((entry) => (
          <ListRow
            key={entry.href}
            href={entry.href}
            title={entry.meta.title}
            summary={entry.meta.summary}
            thumb={thumbFor(entry.meta.slug)}
            locked={entry.meta.protected}
          />
        ))}
      </ListSection>
    </>
  );
}

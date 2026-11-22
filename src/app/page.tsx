import { PROFILE } from "@content/profile";
import { Bio } from "@/components/editorial/Bio";
import { ListRow } from "@/components/editorial/ListRow";
import { ListSection } from "@/components/editorial/ListSection";
import { MascotStage } from "@/components/experiments/MascotStage";
import { entriesOf } from "@/lib/content";

export default function HomePage() {
  return (
    <>
      <header className="intro">
        <h1 className="intro__name">{PROFILE.name}</h1>
        <p className="intro__role">
          Design engineer in Stockholm. <em>Claude Ambassador, Sweden.</em>
        </p>
      </header>
      <Bio />
      <MascotStage />
      <ListSection id="projects" title="Projects">
        {entriesOf("project").map((entry) => (
          <ListRow
            key={entry.href}
            href={entry.href}
            title={entry.meta.title}
            summary={entry.meta.summary}
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
          />
        ))}
      </ListSection>
      <ListSection id="case-study" title="Case studies">
        {entriesOf("case-study").map((entry) => (
          <ListRow
            key={entry.href}
            href={entry.href}
            title={entry.meta.title}
            summary={entry.meta.summary}

            locked={entry.meta.protected}
          />
        ))}
      </ListSection>
    </>
  );
}

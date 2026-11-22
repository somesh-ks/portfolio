import { findEntry, entriesOf } from "./content";
import { ogCard } from "./og";
import type { Kind } from "./schema";

const EYEBROW: Record<Kind, string> = {
  project: "Project",
  experiment: "Experiment",
  "case-study": "Case study",
};

export function entryOgRoute(kind: Kind) {
  return {
    generateStaticParams: () =>
      entriesOf(kind)
        .filter((entry) => !entry.meta.protected)
        .map((entry) => ({ slug: entry.meta.slug })),
    async Image({ params }: { params: Promise<{ slug: string }> }) {
      const entry = findEntry(kind, (await params).slug);
      return ogCard({
        eyebrow: EYEBROW[kind],
        title: entry?.meta.title ?? "Somesh Kesarla Suresh",
        summary: entry?.meta.summary,
      });
    },
  };
}

/** Locked studies share the public teaser in their card: title and summary only. */
export function lockedOg(slug: string) {
  const entry = findEntry("case-study", slug);
  return ogCard({
    eyebrow: "Case study · NDA",
    title: entry?.meta.title ?? slug,
    summary: entry?.meta.summary,
  });
}

import { findEntry, entriesOf } from "./content";
import { ogCard } from "./og";
import type { Kind } from "./schema";

const KIND: Record<Kind, string> = {
  project: "project",
  experiment: "experiment",
  "case-study": "case study",
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
        title: entry?.meta.title ?? "Somesh Kesarla Suresh",
        summary: entry?.meta.summary,
        path: entry?.href,
        meta: KIND[kind],
      });
    },
  };
}

/** Locked studies share the public teaser in their card: title and summary only. */
export function lockedOg(slug: string) {
  const entry = findEntry("case-study", slug);
  return ogCard({
    title: entry?.meta.title ?? slug,
    summary: entry?.meta.summary,
    path: `/work/${slug}`,
    meta: "case study · nda",
  });
}

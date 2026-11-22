import type { Metadata } from "next";
import type { Entry } from "./content";

export function entryMetadata(entry: Entry, extra: Partial<Metadata> = {}): Metadata {
  return {
    title: entry.meta.title,
    description: entry.meta.summary,
    alternates: { canonical: entry.href, types: { "text/markdown": `${entry.href}.md` } },
    openGraph: {
      type: "article",
      title: entry.meta.title,
      description: entry.meta.summary,
      url: entry.href,
      publishedTime: entry.meta.publishedAt,
    },
    ...extra,
  };
}

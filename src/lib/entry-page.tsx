/** Shared static page factory for public entries (projects, experiments, public case studies). */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EntryArticle } from "@/components/editorial/EntryArticle";
import { Mdx } from "@/components/mdx/Mdx";
import { entriesOf, findEntry } from "./content";
import { entryMetadata } from "./metadata";
import type { Kind } from "./schema";

type Params = { params: Promise<{ slug: string }> };

export function publicEntryRoute(kind: Kind) {
  const publicEntries = () => entriesOf(kind).filter((entry) => !entry.meta.protected);
  return {
    generateStaticParams: () => publicEntries().map((entry) => ({ slug: entry.meta.slug })),
    async generateMetadata({ params }: Params): Promise<Metadata> {
      const entry = findEntry(kind, (await params).slug);
      return entry && !entry.meta.protected ? entryMetadata(entry) : {};
    },
    async Page({ params }: Params) {
      const entry = findEntry(kind, (await params).slug);
      // Locked case studies have their own dynamic routes; never render them here.
      if (!entry || entry.meta.protected) notFound();
      const all = entriesOf(kind);
      const next = all[(all.indexOf(entry) + 1) % all.length];
      return (
        <EntryArticle entry={entry} next={next === entry ? undefined : next}>
          <Mdx source={entry.body} />
        </EntryArticle>
      );
    },
  };
}

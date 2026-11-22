import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import type { Entry } from "@/lib/content";
import { entryGraph, serializeJsonLd } from "@/lib/schema-org";
import { BackLink } from "./BackLink";
import { FactsList } from "./FactsList";
import { MetricsStrip } from "./MetricsStrip";

interface EntryArticleProps {
  entry: Entry;
  next?: Entry;
  children: ReactNode;
}

export function EntryArticle({ entry, next, children }: EntryArticleProps) {
  const { meta } = entry;
  return (
    <article className="entry">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(entryGraph(entry)) }}
      />
      <BackLink />
      <header className="entry__header">
        <h1 className="entry__title">{meta.title}</h1>
        <p className="entry__summary">{meta.summary}</p>
        {meta.liveUrl || meta.repoUrl ? (
          <p className="entry__links">
            {meta.liveUrl ? (
              <a href={meta.liveUrl} className="button pressable" target="_blank" rel="noopener">
                Open live <ArrowUpRight aria-hidden="true" size={14} />
              </a>
            ) : null}
            {meta.repoUrl ? (
              <a href={meta.repoUrl} className="button pressable" target="_blank" rel="noopener">
                Source <ArrowUpRight aria-hidden="true" size={14} />
              </a>
            ) : null}
          </p>
        ) : null}
      </header>
      <MetricsStrip metrics={meta.metrics} />
      <FactsList meta={meta} />
      <div className="prose">{children}</div>
      {next ? (
        <nav aria-label="Next" className="entry__next">
          <Link href={next.href as Route} className="next-link pressable">
            <span className="next-link__label">Next</span>
            <span className="next-link__title">{next.meta.title}</span>
            <ArrowRight aria-hidden="true" size={16} className="next-link__icon" />
          </Link>
        </nav>
      ) : null}
    </article>
  );
}

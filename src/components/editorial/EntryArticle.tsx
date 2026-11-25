import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import type { Entry } from "@/lib/content";
import { entryGraph, serializeJsonLd } from "@/lib/schema-org";
import { GitHubMark } from "@/components/ui/GitHubMark";
import { ArticleOutline } from "./ArticleOutline";
import { BackLink } from "./BackLink";
import { FactsList } from "./FactsList";
import { MetricsStrip } from "./MetricsStrip";

interface EntryArticleProps {
  entry: Entry;
  next?: Entry;
  children: ReactNode;
}

/** "https://github.com/owner/repo" -> "owner/repo", the label people recognise. */
const repoName = (url: string) =>
  url.replace(/^https?:\/\/(www\.)?github\.com\//, "").replace(/\/$/, "");

export function EntryArticle({ entry, next, children }: EntryArticleProps) {
  const { meta } = entry;
  // Tools are used, not read: back link, title, one line, then the tool at full width.
  const tool = (meta.layout ?? (meta.kind === "experiment" ? "tool" : "article")) === "tool";
  return (
    <article className={tool ? "entry entry--tool" : "entry"}>
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
                <GitHubMark /> {repoName(meta.repoUrl)}
              </a>
            ) : null}
          </p>
        ) : null}
      </header>
      {tool ? (
        <div className="prose">{children}</div>
      ) : (
        <>
          <MetricsStrip metrics={meta.metrics} />
          <FactsList meta={meta} />
          <div className="entry__body">
            <ArticleOutline />
            <div className="prose">{children}</div>
          </div>
        </>
      )}
      {next && !tool ? (
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

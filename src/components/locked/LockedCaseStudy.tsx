/**
 * Locked case study page. Rendered per request (it reads the session
 * cookie), so it never lands in the static build. The gated body is loaded
 * only after the HMAC session check passes.
 */
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { EntryArticle } from "@/components/editorial/EntryArticle";
import { Mdx } from "@/components/mdx/Mdx";
import { hasAccess, SESSION_COOKIE } from "@/lib/auth";
import { entriesOf, findEntry } from "@/lib/content";
import { entryMetadata } from "@/lib/metadata";
import { loadProtectedBody } from "@/lib/protected-source";
import type { LockedSlug } from "@/lib/site";
import { PasswordGate } from "./PasswordGate";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function isUnlocked(slug: LockedSlug): Promise<boolean> {
  return hasAccess((await cookies()).get(SESSION_COOKIE)?.value, slug);
}

export async function lockedMetadata(slug: LockedSlug): Promise<Metadata> {
  const entry = findEntry("case-study", slug);
  if (!entry) return {};
  // The public teaser is indexable; the unlocked page never is.
  return (await isUnlocked(slug))
    ? entryMetadata(entry, { robots: { index: false, follow: false, nocache: true } })
    : entryMetadata(entry);
}

export async function LockedCaseStudy({
  slug,
  searchParams,
}: {
  slug: LockedSlug;
  searchParams: SearchParams;
}) {
  const entry = findEntry("case-study", slug);
  if (!entry?.meta.protected) notFound();
  const all = entriesOf("case-study");
  const next = all[(all.indexOf(entry) + 1) % all.length];

  if (await isUnlocked(slug)) {
    const body = await loadProtectedBody(slug);
    return (
      <EntryArticle entry={entry} next={next}>
        {body ? (
          <Mdx source={body} mediaBase={`/api/media/${slug}`} />
        ) : (
          <p>The full case study is unavailable right now. Email me and I'll send it directly.</p>
        )}
      </EntryArticle>
    );
  }

  const unlock = (await searchParams).unlock;
  const initialError = unlock === "failed" || unlock === "unavailable" ? unlock : undefined;
  return (
    <EntryArticle entry={entry} next={next}>
      <Mdx source={entry.body} />
      <PasswordGate slug={slug} title={entry.meta.title} initialError={initialError} />
    </EntryArticle>
  );
}

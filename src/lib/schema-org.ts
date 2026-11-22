import { PROFILE } from "@content/profile";
import type { Entry } from "./content";
import { absoluteUrl, SITE_NAME, SITE_URL } from "./site";

export const PERSON_ID = `${SITE_URL}/#person`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function personGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": PERSON_ID,
        name: PROFILE.name,
        url: SITE_URL,
        jobTitle: PROFILE.jobTitle,
        description: PROFILE.headline,
        worksFor: { "@type": "Organization", name: PROFILE.worksFor },
        affiliation: PROFILE.affiliations.map((name) => ({ "@type": "Organization", name })),
        alumniOf: PROFILE.alumniOf.map((name) => ({ "@type": "CollegeOrUniversity", name })),
        homeLocation: {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: PROFILE.location.city,
            addressCountry: "SE",
          },
        },
        knowsAbout: PROFILE.knowsAbout,
        email: `mailto:${PROFILE.email}`,
        sameAs: PROFILE.sameAs,
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: "en",
        author: { "@id": PERSON_ID },
      },
    ],
  };
}

const TYPE_BY_KIND = {
  project: "SoftwareSourceCode",
  experiment: "SoftwareSourceCode",
  "case-study": "TechArticle",
} as const;

const SECTION_NAME = {
  project: "Projects",
  experiment: "Experiments",
  "case-study": "Work",
} as const;

export function entryGraph(entry: Entry) {
  const url = absoluteUrl(entry.href);
  const { meta } = entry;
  const work: Record<string, unknown> = {
    "@type": TYPE_BY_KIND[meta.kind],
    "@id": `${url}#work`,
    headline: meta.title,
    name: meta.title,
    description: meta.summary,
    url,
    datePublished: meta.publishedAt,
    dateModified: meta.updatedAt ?? meta.publishedAt,
    author: { "@id": PERSON_ID },
    keywords: meta.tags.join(", ") || undefined,
    isAccessibleForFree: !meta.protected,
  };
  if (meta.kind !== "case-study") {
    work.codeRepository = meta.repoUrl;
    work.programmingLanguage = "TypeScript";
  }
  return {
    "@context": "https://schema.org",
    "@graph": [
      work,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: SECTION_NAME[meta.kind],
            item: `${SITE_URL}/#${meta.kind}`,
          },
          { "@type": "ListItem", position: 3, name: meta.title, item: url },
        ],
      },
    ],
  };
}

/** JSON.stringify that cannot break out of a <script> element. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

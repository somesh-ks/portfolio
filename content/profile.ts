/**
 * Canonical facts about Somesh. One home for the bio: the homepage, JSON-LD,
 * llms.txt and the Markdown mirror all read from here.
 * Facts that still need Somesh's confirmation are tracked in .agents/state.md.
 */

export interface Company {
  id: string;
  name: string;
}

export const COMPANIES = {
  netlight: {
    id: "netlight",
    name: "Netlight",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
  },
  stripe: {
    id: "stripe",
    name: "Stripe",
  },
  rollsroyce: {
    id: "rollsroyce",
    name: "Rolls-Royce",
  },
  mercedes: {
    id: "mercedes",
    name: "Mercedes-Benz",
  },
  wfp: {
    id: "wfp",
    name: "World Food Programme",
  },
  royc: {
    id: "royc",
    name: "ROYC",
  },
  luminovo: {
    id: "luminovo",
    name: "Luminovo",
  },
  oyo: {
    id: "oyo",
    name: "OYO",
  },
} as const satisfies Record<string, Company>;

export type CompanyId = keyof typeof COMPANIES;

/**
 * Bio paragraphs. `{company:id}` renders as an inline company preview on the
 * web and as plain text in Markdown exports.
 */
export const BIO = [
  "Senior product designer at {company:netlight}. Ambassador at {company:anthropic} and {company:stripe}.",
  "Shipped for {company:rollsroyce}, {company:mercedes}, the {company:wfp}, {company:royc}, {company:luminovo}, {company:oyo} and HackerRank. $1.5M+ saved, 10+ enterprise clients, products used by 3M+ people in 22 countries.",
] as const;

export const PROFILE = {
  name: "Somesh Kesarla Suresh",
  shortName: "Somesh",
  jobTitle: "Senior Product Designer & Design Engineer",
  headline: "Design engineer in Stockholm",
  location: { city: "Stockholm", country: "Sweden" },
  worksFor: "Netlight Consulting",
  affiliations: ["Claude Ambassador, Sweden", "Stripe Ambassador"],
  alumniOf: ["KTH Royal Institute of Technology", "EIT Digital", "VIT University"],
  knowsAbout: [
    "Design Engineering",
    "Design Systems",
    "W3C Design Tokens",
    "Human-AI Interaction",
    "Accessibility (WCAG 2.2)",
  ],
  /** Headline facts that answer engines can cite. Kept to what is public. */
  facts: [
    "4+ years shipping B2B and B2C products across 10+ domains; products used by 3M+ people in 22 countries.",
    "ROYC: 100% demo conversion after the rebrand, growth from 5 to 20 clients, and EUR 200K+ saved with a white-label design system.",
    "Luminovo: +42% sourcing completion and a 57% faster quote cycle across the top 50 clients.",
  ],
  email: "k.s.somesh11@gmail.com",
  links: [
    { label: "Email", href: "mailto:k.s.somesh11@gmail.com" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/someshks/" },
    { label: "X", href: "https://x.com/someshks11" },
    { label: "GitHub", href: "https://github.com/somesh-ks" },
    { label: "Resume", href: "/resume" },
  ],
  sameAs: [
    "https://www.linkedin.com/in/someshks/",
    "https://x.com/someshks11",
    "https://github.com/somesh-ks",
    "https://someshks.me",
  ],
} as const;

/** Bio with company tokens resolved to plain names. */
export function plainBio(): string[] {
  return BIO.map((paragraph) =>
    paragraph.replace(
      /\{company:([a-z]+)\}/g,
      (_, id: string) => COMPANIES[id as CompanyId]?.name ?? id,
    ),
  );
}

/**
 * Canonical facts about Somesh. One home for the bio: the homepage, JSON-LD,
 * llms.txt and the Markdown mirror all read from here.
 * Facts that still need Somesh's confirmation are tracked in .agents/state.md.
 */

export interface Company {
  id: string;
  name: string;
  /** One line about the company itself. */
  about: string;
  /** One line on Somesh's connection to it. */
  relation: string;
}

export const COMPANIES = {
  netlight: {
    id: "netlight",
    name: "Netlight",
    about: "IT and design consultancy founded in Stockholm.",
    relation: "Senior product designer since 2022.",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    about: "AI safety company and the makers of Claude.",
    relation: "Claude Ambassador, Sweden.",
  },
  bmw: {
    id: "bmw",
    name: "BMW / Rolls-Royce",
    about: "Automotive group behind BMW, MINI and Rolls-Royce Motor Cars.",
    relation: "Climate and Settings HMI apps, and the first Neue Klasse pilot for Rolls-Royce.",
  },
  wfp: {
    id: "wfp",
    name: "World Food Programme",
    about: "The United Nations agency for food assistance.",
    relation: "SchoolOps, meal data for 3M students in 22 countries.",
  },
  royc: {
    id: "royc",
    name: "ROYC",
    about: "Private-markets infrastructure for family offices and wealth managers.",
    relation: "Lead product designer. Rebrand and a white-label design system.",
  },
  luminovo: {
    id: "luminovo",
    name: "Luminovo",
    about: "Sourcing and quoting software for electronics manufacturers.",
    relation: "Product designer. Redesigned sourcing and quoting.",
  },
  oyo: {
    id: "oyo",
    name: "OYO",
    about: "Hospitality platform that started in India.",
    relation: "One CRM for 90K+ users, replacing seven legacy tools.",
  },
} as const satisfies Record<string, Company>;

export type CompanyId = keyof typeof COMPANIES;

/**
 * Bio paragraphs. `{company:id}` renders as an inline company preview on the
 * web and as plain text in Markdown exports.
 */
export const BIO = [
  "I'm a senior product designer at {company:netlight}. I've shipped for {company:bmw}, the {company:wfp}, {company:royc}, {company:luminovo} and {company:oyo}, used by 3M+ people in 22 countries.",
  "I'm a Claude Ambassador at {company:anthropic}, running the AI for Designers community, and a Stripe Ambassador, building the startup community. Now I'm working out what a design system needs so coding agents can build with it well.",
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

/**
 * Agent-readable surface: /llms.txt, /llms-full.txt and the per-page .md
 * mirrors. Everything here is built from lib/content.ts, which can only see
 * content/public. Locked case studies contribute their public teaser and
 * metrics, never their gated body.
 */
import { PROFILE, plainBio } from "@content/profile";
import {
  COMMUNITY,
  EDUCATION,
  EXPERIENCE,
  RESUME_PDF_URL,
  RESUME_SUMMARY,
  SKILLS,
} from "@content/resume";
import { allEntries, entriesOf, type Entry } from "./content";
import { mdxToMarkdown } from "./markdown-export";
import { absoluteUrl, SITE_URL } from "./site";

export const NDA_NOTICE =
  "The full case study is under NDA and shared on request. This page contains only the public summary.";

function factsTable(entry: Entry): string {
  const { meta } = entry;
  const rows: [string, string | undefined][] = [
    ["Role", meta.role],
    ["Timeline", meta.timeline],
    ["Team", meta.team],
    ["Problem", meta.problem],
    ["Outcomes", meta.metrics.join("; ") || undefined],
    ["Stack", meta.stack.join(", ") || undefined],
  ];
  const present = rows.filter((row): row is [string, string] => Boolean(row[1]));
  if (!present.length) return "";
  return [
    "| Fact | Detail |",
    "| --- | --- |",
    ...present.map(([key, value]) => `| ${key} | ${value.replace(/\|/g, "\\|")} |`),
  ].join("\n");
}

function links(entry: Entry): string {
  const items = [
    entry.meta.liveUrl && `- Live: ${entry.meta.liveUrl}`,
    entry.meta.repoUrl && `- Source: ${entry.meta.repoUrl}`,
  ].filter(Boolean);
  return items.join("\n");
}

function entryMarkdown(entry: Entry): string {
  const { meta } = entry;
  const parts = [
    `# ${meta.title}`,
    `> ${meta.summary}`,
    `Canonical: ${absoluteUrl(entry.href)}  \nAuthor: ${PROFILE.name}  \nPublished: ${meta.publishedAt}${meta.updatedAt ? `  \nUpdated: ${meta.updatedAt}` : ""}`,
    factsTable(entry),
    meta.protected ? `**${NDA_NOTICE}**` : "",
    mdxToMarkdown(entry.body),
    links(entry),
  ];
  return `${parts.filter(Boolean).join("\n\n")}\n`;
}

function listLine(entry: Entry, suffix = ""): string {
  return `- [${entry.meta.title}](${absoluteUrl(`${entry.href}.md`)}): ${entry.meta.summary}${suffix}`;
}

function homeMarkdown(): string {
  const caseStudies = entriesOf("case-study");
  return [
    `# ${PROFILE.name}`,
    `> ${PROFILE.headline}. ${PROFILE.affiliations.join(". ")}.`,
    ...plainBio(),
    "## Projects",
    entriesOf("project")
      .map((entry) => listLine(entry))
      .join("\n"),
    "## Experiments",
    entriesOf("experiment")
      .map((entry) => listLine(entry))
      .join("\n"),
    "## Case studies",
    caseStudies
      .map((entry) =>
        listLine(entry, entry.meta.protected ? " (summary only, full study under NDA)" : ""),
      )
      .join("\n"),
    "## Links",
    PROFILE.links
      .map(
        (link) =>
          `- ${link.label}: ${link.href.startsWith("/") ? absoluteUrl(link.href) : link.href}`,
      )
      .join("\n"),
    "",
  ].join("\n\n");
}

export function llmsTxt(): string {
  const caseStudies = entriesOf("case-study");
  const bio = `${PROFILE.name} is a ${PROFILE.jobTitle.toLowerCase()} in ${PROFILE.location.city}, ${PROFILE.location.country}. ${PROFILE.affiliations.join("; ")}. Works at ${PROFILE.worksFor}. ${PROFILE.facts.join(" ")}`;
  return [
    `# ${PROFILE.name}`,
    `> ${bio}`,
    `Every page on ${SITE_URL} has a Markdown version: append \`.md\` to the path, or send \`Accept: text/markdown\`. The full public text is at ${absoluteUrl("/llms-full.txt")}.`,
    "## Projects",
    entriesOf("project")
      .map((entry) => listLine(entry))
      .join("\n"),
    "## Experiments",
    entriesOf("experiment")
      .map((entry) => listLine(entry))
      .join("\n"),
    "## Public Case Studies",
    caseStudies
      .filter((entry) => !entry.meta.protected)
      .map((entry) => listLine(entry))
      .join("\n"),
    "## Enterprise Case Studies (Summaries Only)",
    caseStudies
      .filter((entry) => entry.meta.protected)
      .map((entry) => listLine(entry, ` Outcomes: ${entry.meta.metrics.join("; ")}.`))
      .join("\n"),
    "## Optional",
    `- [About](${absoluteUrl("/index.md")}): Bio and links.`,
    `- [Resume](${absoluteUrl("/resume.md")}): Experience, education and skills.`,
    "",
  ].join("\n\n");
}

export function llmsFullTxt(): string {
  return [homeMarkdown(), resumeMarkdown(), ...allEntries().map(entryMarkdown)].join("\n---\n\n");
}

function resumeMarkdown(): string {
  const roles = EXPERIENCE.map((role) =>
    [
      `### ${role.title}, ${role.organisation}`,
      `${role.period} · ${role.location}`,
      ...role.projects.map(
        (project) => `- **${project.name}** (${project.context}): ${project.outcome}`,
      ),
    ].join("\n\n"),
  );
  return [
    `# ${PROFILE.name}: Resume`,
    `> ${RESUME_SUMMARY}`,
    `PDF: ${RESUME_PDF_URL}`,
    "## Experience",
    ...roles,
    "## Education",
    EDUCATION.map((item) => `- ${item.degree}, ${item.school}`).join("\n"),
    "## Skills",
    SKILLS.map((skill) => `- **${skill.area}:** ${skill.items}`).join("\n"),
    "## Community",
    COMMUNITY.map((item) => `- ${item}`).join("\n"),
    "",
  ].join("\n\n");
}

/** Public site paths that have a Markdown mirror. */
export function markdownPaths(): string[] {
  return ["/", "/resume", ...allEntries().map((entry) => entry.href)];
}

export function markdownForPath(pathname: string): string | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/" || clean === "/index") return homeMarkdown();
  if (clean === "/resume") return resumeMarkdown();
  const entry = allEntries().find((candidate) => candidate.href === clean);
  return entry ? entryMarkdown(entry) : null;
}

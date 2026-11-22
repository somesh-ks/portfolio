/**
 * Public content loader. Reads ONLY content/public/**. Protected case-study
 * bodies never live in this repo; see lib/protected-source.ts.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { ContentMetaSchema, type ContentMeta, type Kind } from "./schema";
import { KIND_PATH } from "./site";

export interface Entry {
  meta: ContentMeta;
  /** MDX body. For protected case studies this is the public teaser only. */
  body: string;
  /** Site path, e.g. /work/claude-stickers */
  href: string;
}

const PUBLIC_ROOT = path.join(process.cwd(), "content", "public");
const KIND_DIR: Record<Kind, string> = {
  project: "projects",
  experiment: "experiments",
  "case-study": "case-studies",
};

let cache: Entry[] | undefined;

function readEntries(): Entry[] {
  const entries: Entry[] = [];
  for (const [kind, dir] of Object.entries(KIND_DIR) as [Kind, string][]) {
    const folder = path.join(PUBLIC_ROOT, dir);
    for (const file of readdirSync(folder)
      .filter((name) => name.endsWith(".mdx"))
      .sort()) {
      const source = readFileSync(path.join(folder, file), "utf8");
      const { data, content } = matter(source);
      // gray-matter parses YAML dates into Date objects; the schema wants ISO strings.
      const normalised = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          value instanceof Date ? value.toISOString().slice(0, 10) : value,
        ]),
      );
      const parsed = ContentMetaSchema.safeParse(normalised);
      if (!parsed.success) {
        throw new Error(`Invalid frontmatter in ${dir}/${file}: ${parsed.error.message}`);
      }
      const meta = parsed.data;
      if (meta.kind !== kind) throw new Error(`${dir}/${file}: kind must be "${kind}"`);
      if (`${meta.slug}.mdx` !== file) throw new Error(`${dir}/${file}: slug must match file name`);
      entries.push({ meta, body: content.trim(), href: `/${KIND_PATH[kind]}/${meta.slug}` });
    }
  }
  return entries;
}

export function allEntries(): Entry[] {
  cache ??= readEntries();
  return cache;
}

export function entriesOf(kind: Kind): Entry[] {
  return allEntries()
    .filter((entry) => entry.meta.kind === kind)
    .sort((a, b) => a.meta.order - b.meta.order);
}

export function findEntry(kind: Kind, slug: string): Entry | undefined {
  return allEntries().find((entry) => entry.meta.kind === kind && entry.meta.slug === slug);
}

export function lockedSlugs(): string[] {
  return entriesOf("case-study")
    .filter((entry) => entry.meta.protected)
    .map((entry) => entry.meta.slug);
}

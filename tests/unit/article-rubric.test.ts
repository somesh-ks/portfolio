import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { COMPONENT_DESCRIPTIONS } from "@/lib/markdown-export";
import { THUMBS } from "@/lib/thumbs/art";

const ROOT = process.cwd();
const CASE_STUDIES_DIR = path.join(ROOT, "content", "public", "case-studies");
const CASE_STUDY_COMPONENTS_DIR = path.join(ROOT, "src", "components", "case-studies");
const PUBLIC_DIR = path.join(ROOT, "public");
const PUBLIC_CASE_STUDIES_DIR = path.resolve(PUBLIC_DIR, "case-studies");
const MAX_IMAGE_BYTES = 450 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = new Set([".webp", ".avif", ".svg"]);
const BANNED_HEADINGS = new Set([
  "the problem",
  "problem",
  "solution",
  "takeaways",
  "key takeaways",
  "overview",
  "conclusion",
  "bets",
]);

interface CaseStudyFile {
  file: string;
  raw: string;
  data: Record<string, unknown>;
  body: string;
}

function readCaseStudies(): CaseStudyFile[] {
  return readdirSync(CASE_STUDIES_DIR)
    .filter((name) => name.endsWith(".mdx"))
    .sort()
    .map((file) => {
      const raw = readFileSync(path.join(CASE_STUDIES_DIR, file), "utf8");
      const { data, content } = matter(raw);
      return { file, raw, data, body: content };
    });
}

function stripFencedCode(source: string): string {
  const lines = source.split("\n");
  const kept: string[] = [];
  let fence: string | null = null;
  for (const line of lines) {
    const match = /^\s*(```|~~~)/.exec(line);
    if (match) {
      const marker = match[1] ?? "";
      if (fence === null) {
        fence = marker;
        continue;
      }
      if (marker === fence) {
        fence = null;
        continue;
      }
    }
    if (fence === null) kept.push(line);
  }
  return kept.join("\n");
}

function stripJsxBlocks(source: string): string {
  // Strip self-closing tags first so they never eat prose up to a later paired component.
  return source
    .replace(/<[A-Z][A-Za-z0-9]*\b(?:[^>"']|"[^"]*"|'[^']*')*\/>/g, " ")
    .replace(/<([A-Z][A-Za-z0-9]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1>/g, " ");
}

function countProseWords(body: string): number {
  const withoutCode = stripFencedCode(body);
  const withoutJsx = stripJsxBlocks(withoutCode);
  return withoutJsx
    .replace(/^#{1,6}\s+/gm, "")
    .trim()
    .split(/\s+/)
    .filter((token) => /[A-Za-z0-9]/.test(token)).length;
}

function* walkFiles(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else if (entry.isFile()) yield full;
  }
}

const allStudies = readCaseStudies();
const publicStudies = allStudies.filter((entry) => entry.data.protected !== true);

describe("article rubric", () => {
  test("every non-protected case study meets prose word count (80 to 650)", () => {
    for (const entry of publicStudies) {
      const words = countProseWords(entry.body);
      expect(words, `${entry.file}: ${words} prose words`).toBeGreaterThanOrEqual(80);
      expect(words, `${entry.file}: ${words} prose words`).toBeLessThanOrEqual(650);
    }
  });

  test("every public case study, comic component, and export map has zero em dashes or spaced en dashes", () => {
    const texts: { label: string; text: string }[] = [
      ...publicStudies.map((entry) => ({ label: entry.file, text: entry.raw })),
      ...readdirSync(CASE_STUDY_COMPONENTS_DIR)
        .filter((name) => name.endsWith(".tsx"))
        .sort()
        .map((file) => ({
          label: file,
          text: readFileSync(path.join(CASE_STUDY_COMPONENTS_DIR, file), "utf8"),
        })),
      {
        label: "src/lib/markdown-export.ts",
        text: readFileSync(path.join(ROOT, "src", "lib", "markdown-export.ts"), "utf8"),
      },
    ];
    for (const item of texts) {
      expect(item.text, `${item.label}: em dash found`).not.toContain("\u2014");
      expect(item.text, `${item.label}: spaced en dash found`).not.toContain(" \u2013 ");
    }
  });

  test("every non-protected case study follows heading rules", () => {
    for (const entry of publicStudies) {
      const cleanBody = stripFencedCode(entry.body);
      const h2s = cleanBody
        .split("\n")
        .map((line) => /^##\s+(.+?)\s*$/.exec(line)?.[1])
        .filter((title): title is string => Boolean(title));
      const deepHeadings = cleanBody.split("\n").filter((line) => /^#{3,6}\s+/.test(line));

      expect(h2s.length, `${entry.file}: needs >= 2 ## headings`).toBeGreaterThanOrEqual(2);
      expect(h2s.at(-1), `${entry.file}: must end with ## Looking back`).toBe("Looking back");
      expect(deepHeadings, `${entry.file}: ### to ###### headings are disallowed`).toEqual([]);

      for (const heading of h2s) {
        expect(heading, `${entry.file}: numbered heading "${heading}"`).not.toMatch(/^\d+\b/);
        expect(
          BANNED_HEADINGS.has(heading.toLowerCase()),
          `${entry.file}: banned generic heading "${heading}"`,
        ).toBe(false);
        expect(
          heading.length,
          `${entry.file}: heading "${heading}" exceeds 36 chars (${heading.length})`,
        ).toBeLessThanOrEqual(36);
      }
    }
  });

  test("every PascalCase JSX component outside code fences has a non-generic description", () => {
    for (const entry of publicStudies) {
      const cleanBody = stripFencedCode(entry.body).replace(/`[^`\n]*`/g, " ");
      const matches = cleanBody.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g);
      for (const match of matches) {
        const component = match[1] ?? "";
        expect(
          Object.hasOwn(COMPONENT_DESCRIPTIONS, component),
          `${entry.file}: <${component}> missing from COMPONENT_DESCRIPTIONS`,
        ).toBe(true);
        const description = (COMPONENT_DESCRIPTIONS[component] ?? "").trim();
        expect(description.length, `${component}: empty description`).toBeGreaterThan(0);
        expect(description, `${component}: fallback description`).not.toBe(
          "Interactive component.",
        );
      }
    }
  });

  test("every referenced /case-studies/ asset and file on disk is WebP/AVIF/SVG and <= 450 KB", () => {
    const sources: { label: string; text: string }[] = [
      ...publicStudies.map((entry) => ({ label: entry.file, text: entry.raw })),
      ...readdirSync(CASE_STUDY_COMPONENTS_DIR)
        .filter((name) => name.endsWith(".tsx"))
        .sort()
        .map((file) => ({
          label: file,
          text: readFileSync(path.join(CASE_STUDY_COMPONENTS_DIR, file), "utf8"),
        })),
    ];

    for (const source of sources) {
      const refs = source.text.match(/\/case-studies\/[^\s"'`),>]+/g) ?? [];
      for (const ref of refs) {
        const cleanRef = ref.replace(/[.,;:]$/, "");
        const diskPath = path.resolve(PUBLIC_DIR, cleanRef.slice(1));
        expect(
          diskPath.startsWith(PUBLIC_CASE_STUDIES_DIR + path.sep),
          `${source.label}: invalid asset path ${cleanRef}`,
        ).toBe(true);
        expect(existsSync(diskPath), `${source.label}: missing asset ${cleanRef}`).toBe(true);
        expect(statSync(diskPath).isFile(), `${source.label}: not a file ${cleanRef}`).toBe(true);
        const ext = path.extname(diskPath).toLowerCase();
        expect(
          ALLOWED_IMAGE_EXTENSIONS.has(ext),
          `${source.label}: ${cleanRef} must be .webp, .avif, or .svg`,
        ).toBe(true);
        const size = statSync(diskPath).size;
        expect(
          size,
          `${source.label}: ${cleanRef} is ${size} bytes (limit ${MAX_IMAGE_BYTES})`,
        ).toBeLessThanOrEqual(MAX_IMAGE_BYTES);
      }
    }

    for (const file of walkFiles(PUBLIC_CASE_STUDIES_DIR)) {
      const ext = path.extname(file).toLowerCase();
      expect(ALLOWED_IMAGE_EXTENSIONS.has(ext), `${file}: must be .webp, .avif, or .svg`).toBe(
        true,
      );
      const size = statSync(file).size;
      expect(size, `${file}: ${size} bytes (limit ${MAX_IMAGE_BYTES})`).toBeLessThanOrEqual(
        MAX_IMAGE_BYTES,
      );
    }
  });

  test("every case study with home !== false has a drawn THUMBS entry", () => {
    for (const entry of allStudies) {
      if (entry.data.home === false) continue;
      const slug = typeof entry.data.slug === "string" ? entry.data.slug : "";
      expect(slug, `${entry.file}: missing slug`).not.toBe("");
      expect(
        Boolean(THUMBS[slug]),
        `${entry.file}: missing THUMBS["${slug}"] in src/lib/thumbs/art.tsx`,
      ).toBe(true);
    }
  });
});

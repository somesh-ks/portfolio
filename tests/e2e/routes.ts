import { readdirSync, readFileSync } from "node:fs";
import matter from "gray-matter";

const KIND_PATH = { projects: "/projects", experiments: "/experiments", "case-studies": "/work" };

/** Every entry, read from the content folders so new entries are covered.
 * `href` is where it opens: its own page, or frontmatter `href` (a path or URL). */
function entries() {
  return Object.entries(KIND_PATH).flatMap(([dir, base]) =>
    readdirSync(`content/public/${dir}`)
      .filter((file) => file.endsWith(".mdx"))
      .map((file) => {
        const { data } = matter(readFileSync(`content/public/${dir}/${file}`, "utf8"));
        const page = `${base}/${file.replace(/\.mdx$/, "")}`;
        return {
          page,
          href: (data.href as string | undefined) ?? page,
          own: !data.href,
          home: data.home !== false,
          newTab: data.newTab === true,
        };
      }),
  );
}

/** Every public route with its own page. */
export function publicRoutes(): string[] {
  return [
    "/",
    "/resume",
    ...entries()
      .filter((e) => e.own)
      .map((e) => e.page),
  ];
}

/** On-site routes the homepage opens in place: entries without `home: false`, minus links out and new tabs. */
export function homeRoutes(): string[] {
  return entries()
    .filter((e) => e.home && !e.newTab && e.href.startsWith("/"))
    .map((e) => e.href);
}

export const LOCKED = ["/work/royc", "/work/luminovo"];

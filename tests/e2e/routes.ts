import { readdirSync, readFileSync } from "node:fs";

const KIND_PATH = { projects: "/projects", experiments: "/experiments", "case-studies": "/work" };

/** Every public route, read from the content folders so new entries are covered. */
export function publicRoutes(): string[] {
  const entries = Object.entries(KIND_PATH).flatMap(([dir, base]) =>
    readdirSync(`content/public/${dir}`)
      .filter((file) => file.endsWith(".mdx"))
      .map((file) => `${base}/${file.replace(/\.mdx$/, "")}`),
  );
  return ["/", "/resume", ...entries];
}

/** Routes the homepage lists: every entry without `home: false` in its frontmatter. */
export function homeRoutes(): string[] {
  return Object.entries(KIND_PATH).flatMap(([dir, base]) =>
    readdirSync(`content/public/${dir}`)
      .filter((file) => file.endsWith(".mdx"))
      .filter(
        (file) => !/^home: false$/m.test(readFileSync(`content/public/${dir}/${file}`, "utf8")),
      )
      .map((file) => `${base}/${file.replace(/\.mdx$/, "")}`),
  );
}

export const LOCKED = ["/work/royc", "/work/luminovo"];

export const SITE_URL = "https://someshks.com";
export const SITE_NAME = "Somesh Kesarla Suresh";

export const KIND_PATH = {
  project: "projects",
  experiment: "experiments",
  "case-study": "work",
} as const;

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

/** Case studies whose full body is gated. A unit test keeps this in sync
 * with the `protected: true` frontmatter in content/public/case-studies. */
export const LOCKED_SLUGS = ["royc", "luminovo"] as const;
export type LockedSlug = (typeof LOCKED_SLUGS)[number];

export function isLockedSlug(value: string): value is LockedSlug {
  return (LOCKED_SLUGS as readonly string[]).includes(value);
}

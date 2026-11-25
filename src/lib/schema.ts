import { z } from "zod";
import { KIND_PATH } from "./site";

const KINDS = ["project", "experiment", "case-study"] as const;
export type Kind = (typeof KINDS)[number];

export const ContentMetaSchema = z
  .object({
    title: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    kind: z.enum(KINDS),
    summary: z.string().min(1).max(160),
    publishedAt: z.iso.date(),
    updatedAt: z.iso.date().optional(),
    order: z.number().int().default(100),
    role: z.string().optional(),
    timeline: z.string().optional(),
    team: z.string().optional(),
    problem: z.string().optional(),
    stack: z.array(z.string()).default([]),
    metrics: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    protected: z.boolean().default(false),
    /** "tool": the interactive piece is the page, full width, no facts or outline. Experiments default to it. */
    layout: z.enum(["article", "tool"]).optional(),
    /** false keeps the page live (URL, Cmd+K, llms.txt) but off the homepage lists. */
    home: z.boolean().default(true),
    canonicalUrl: z.url().optional(),
    repoUrl: z.url().optional(),
    liveUrl: z.url().optional(),
    /** Where the entry lives instead of its own page: a site path or a URL. The
     * old /<kind>/<slug> page 308s there (next.config.ts). */
    href: z
      .union([z.url({ protocol: /^https?$/ }), z.string().regex(/^\/[a-z0-9/-]*$/)])
      .optional(),
  })
  .strict()
  .refine((meta) => !meta.protected || meta.kind === "case-study", {
    message: "Only case studies can be protected",
  })
  .refine((meta) => meta.href !== `/${KIND_PATH[meta.kind]}/${meta.slug}`, {
    message: "href can't point back at the entry's own page",
  });

export type ContentMeta = z.infer<typeof ContentMetaSchema>;

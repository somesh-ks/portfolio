import { z } from "zod";

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
    canonicalUrl: z.url().optional(),
    repoUrl: z.url().optional(),
    liveUrl: z.url().optional(),
  })
  .strict()
  .refine((meta) => !meta.protected || meta.kind === "case-study", {
    message: "Only case studies can be protected",
  });

export type ContentMeta = z.infer<typeof ContentMetaSchema>;

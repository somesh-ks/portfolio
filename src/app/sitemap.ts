import type { MetadataRoute } from "next";
import { allEntries } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "monthly", priority: 1 },
    { url: absoluteUrl("/resume"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/spring"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/stickers"), changeFrequency: "monthly", priority: 0.7 },
    // Locked case studies are listed by their public teaser URL only.
    ...allEntries()
      .filter((entry) => entry.page)
      .map((entry) => ({
        url: absoluteUrl(entry.href),
        lastModified: entry.meta.updatedAt ?? entry.meta.publishedAt,
        changeFrequency: "yearly" as const,
        priority: entry.meta.kind === "case-study" ? 0.8 : 0.6,
      })),
  ];
}

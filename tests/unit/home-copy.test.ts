import { describe, expect, test } from "bun:test";
import { entriesOf } from "@/lib/content";
import type { Kind } from "@/lib/schema";

/**
 * Somesh wrote this copy himself (2026-11-23). Agents must not reword, recase or reorder it.
 * Change it only when Somesh asks for the new text, then update this list in the same PR.
 * Traceless is off the homepage (home: false) at his request (2026-11-25).
 * Writing rows show a date instead of a summary, so only their titles are locked.
 */
const FINAL: Record<Kind, [title: string, summary?: string][]> = {
  project: [
    ["Skills", "Agent skills to craft great interfaces"],
    ["Singularity", "Podcast app you'd love"],
    ["Spring", "Tools to shape a design system"],
    ["Singularity ds", "Agentic design system"],
  ],
  experiment: [
    ["Tide", "Ambient sound and visuals to unwind"],
    ["Claude studio", "Customize your claude"],
  ],
  "case-study": [
    ["Making graphic comics"],
    ["Building an agentic design system"],
    ["Growing a bank investing platform 4x"],
    ["Making electronics quoting 57% faster"],
  ],
};

describe("homepage copy is Somesh's finalized text", () => {
  for (const [kind, rows] of Object.entries(FINAL) as [Kind, typeof FINAL.project][]) {
    test(kind, () => {
      const home = entriesOf(kind).filter((entry) => entry.meta.home);
      expect(home.map((e) => e.meta.title)).toEqual(rows.map(([title]) => title));
      for (const [title, summary] of rows) {
        if (summary) expect(home.find((e) => e.meta.title === title)?.meta.summary).toBe(summary);
      }
    });
  }
});

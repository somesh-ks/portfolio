import { describe, expect, test } from "bun:test";
import { entriesOf, lockedSlugs } from "@/lib/content";
import { mdxToMarkdown } from "@/lib/markdown-export";
import { buildRamp, contrastRatio, inGamut } from "@/lib/oklch";
import { LOCKED_SLUGS } from "@/lib/site";

describe("content", () => {
  test("LOCKED_SLUGS matches the protected frontmatter (proxy and routes rely on it)", () => {
    expect(lockedSlugs().toSorted()).toEqual([...LOCKED_SLUGS].toSorted());
  });

  test("the plan's mix is present: 6 projects, 4 experiments, 5 case studies", () => {
    expect(entriesOf("project")).toHaveLength(6);
    expect(entriesOf("experiment")).toHaveLength(4);
    expect(entriesOf("case-study")).toHaveLength(5);
  });
});

describe("mdxToMarkdown", () => {
  test("replaces components with a description and keeps code fences intact", () => {
    const source = [
      "import X from 'y'",
      "Intro",
      "",
      "<AgenticTokenDiff />",
      "",
      "<Figure",
      '  src="a.webp"',
      '  alt="A chart"',
      "/>",
      "```tsx",
      "<Button />",
      "```",
    ].join("\n");
    const markdown = mdxToMarkdown(source);
    expect(markdown).not.toContain("import");
    expect(markdown).toContain("> Interactive on the web:");
    expect(markdown).toContain("*Figure: A chart*");
    expect(markdown).toContain("<Button />");
  });

  test("keeps a Command's text as a bash fence", () => {
    const markdown = mdxToMarkdown('<Command command="npx skills add a/b" />');
    expect(markdown).toContain("```bash\nnpx skills add a/b\n```");
  });
});

describe("oklch", () => {
  test("ramp stays in sRGB gamut at high chroma", () => {
    for (const hue of [0, 40, 140, 260, 320]) {
      for (const { color } of buildRamp(hue, 0.3)) expect(inGamut(color)).toBe(true);
    }
  });

  test("contrast matches WCAG reference values", () => {
    expect(contrastRatio({ l: 1, c: 0, h: 0 }, { l: 0, c: 0, h: 0 })).toBeCloseTo(21, 0);
    expect(contrastRatio({ l: 1, c: 0, h: 0 }, { l: 1, c: 0, h: 0 })).toBeCloseTo(1, 5);
  });
});

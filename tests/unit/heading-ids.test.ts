import { describe, expect, test } from "bun:test";
import { rehypeHeadingIds } from "@/lib/heading-ids";

type El = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: El[];
};

const h2 = (...children: El[]): El => ({
  type: "element",
  tagName: "h2",
  properties: {},
  children,
});
const text = (value: string): El => ({ type: "text", value });

function idsOf(headings: El[]) {
  const tree = { type: "root", children: headings };
  rehypeHeadingIds()(tree);
  return headings.map((h) => h.properties?.id);
}

describe("rehypeHeadingIds", () => {
  test("slugs the text, including nested inline markup", () => {
    expect(
      idsOf([
        h2(text("Bet 1: "), { type: "element", tagName: "strong", children: [text("Ship it")] }),
      ]),
    ).toEqual(["bet-1-ship-it"]);
  });

  test("dedupes repeats and avoids the main landmark id", () => {
    expect(idsOf([h2(text("The problem")), h2(text("The problem")), h2(text("Main"))])).toEqual([
      "the-problem",
      "the-problem-2",
      "main-section",
    ]);
  });

  test("falls back when a heading has no letters", () => {
    expect(idsOf([h2(text("—"))])).toEqual(["section-1"]);
  });
});

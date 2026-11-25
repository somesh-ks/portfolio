import { describe, expect, test } from "bun:test";
import { entriesOf } from "@/lib/content";
import { THUMBS } from "@/lib/thumbs/art";

/** Every homepage row gets a drawn thumbnail (.agents/skills/thumbnails/SKILL.md). */
describe("row thumbnails", () => {
  const home = (["project", "experiment", "case-study"] as const).flatMap((kind) =>
    entriesOf(kind).filter((entry) => entry.meta.home),
  );

  test("every homepage row has one", () => {
    expect(
      home.filter((entry) => !THUMBS[entry.meta.slug]).map((entry) => entry.meta.slug),
    ).toEqual([]);
  });

  test("each accent is a --thumb-* token", () => {
    const css = Bun.file("src/styles/tokens.css").text();
    return css.then((text) => {
      for (const art of Object.values(THUMBS)) expect(text).toContain(`${art.accent}:`);
    });
  });
});

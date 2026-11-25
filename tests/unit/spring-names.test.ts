import { expect, test } from "bun:test";
import { formatOf, typeName, typeSnippet, withFormat } from "@/lib/spring/names";
import { DEFAULT_INPUT } from "@/lib/spring/system";

test("each format names a type token its own way", () => {
  expect(typeName("h1", "css")).toBe("--text-h1");
  expect(typeName("h1", "tailwind")).toBe("text-h1");
  expect(typeName("h1", "dtcg")).toBe("typography.h1");
  expect(typeSnippet("h1", "shadcn")).toBe("text-h1");
  expect(typeSnippet("h1", "dtcg")).toBe("{typography.h1}");
  expect(typeSnippet("h1", "css")).toContain("line-height: var(--text-h1--line-height);");
});

test("shadcn/ui is Tailwind plus shadcn components, and leaving it drops shadcn", () => {
  const shadcn = withFormat(DEFAULT_INPUT.stack, "shadcn");
  expect(shadcn.styling).toBe("tailwind");
  expect(formatOf(shadcn)).toBe("shadcn");
  const css = withFormat(shadcn, "css");
  expect(css.components).toBeUndefined();
  expect(formatOf(css)).toBe("css");
});

test("plain Tailwind never exports shadcn, so the picker and the export agree", () => {
  const tw = withFormat(withFormat(DEFAULT_INPUT.stack, "shadcn"), "tailwind");
  expect(tw.components).not.toBe("shadcn");
  expect(formatOf(tw)).toBe("tailwind");
  expect(formatOf(withFormat(DEFAULT_INPUT.stack, "tailwind"))).toBe("tailwind");
  expect(formatOf(DEFAULT_INPUT.stack)).toBe("shadcn");
});

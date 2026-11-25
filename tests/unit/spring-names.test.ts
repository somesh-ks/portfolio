import { expect, test } from "bun:test";
import { tokenName, tokenRef, typeSnippet } from "@/lib/spring/names";

test("CSS names are variables", () => {
  expect(tokenRef("--space-4", "css")).toBe("var(--space-4)");
  expect(tokenName("--space-4", "css")).toBe("--space-4");
});

test("Tailwind names are the utilities theme.css makes", () => {
  expect(tokenRef("--text-h1", "tailwind")).toBe("text-h1");
  expect(tokenRef("--space-0-5", "tailwind")).toBe("p-0.5");
  expect(tokenRef("--radius-md", "tailwind")).toBe("rounded-md");
  expect(tokenRef("--ease-in-out", "tailwind")).toBe("ease-in-out");
  expect(tokenRef("--duration-base", "tailwind")).toBe("duration-(--duration-base)");
});

test("copy snippets follow the stack", () => {
  expect(typeSnippet("h1", "tailwind")).toBe("text-h1");
  expect(typeSnippet("h1", "css")).toContain("line-height: var(--text-h1--line-height);");
});

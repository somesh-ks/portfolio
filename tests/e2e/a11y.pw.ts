import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { LOCKED, publicRoutes } from "./routes.ts";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`@a11y ${scheme}`, () => {
    test.use({ colorScheme: scheme });
    for (const path of new Set([...publicRoutes(), ...LOCKED, "/spring"])) {
      test(`${path} has no WCAG 2.2 AA violations @a11y`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
        const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
        expect(
          violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`),
        ).toEqual([]);
      });
    }
    test("the Cmd+K palette has no WCAG 2.2 AA violations @a11y", async ({ page }) => {
      await page.goto("/");
      await page.keyboard.press("ControlOrMeta+k");
      await expect(page.getByRole("combobox", { name: "Jump to" })).toBeFocused();
      await page.keyboard.press("ArrowDown");
      const { violations } = await new AxeBuilder({ page })
        .include(".palette")
        .withTags(WCAG)
        .analyze();
      expect(violations.map((v) => v.id)).toEqual([]);
    });
  });
}

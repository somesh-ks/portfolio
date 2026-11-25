import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { LOCKED, publicRoutes } from "./routes.ts";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`@a11y ${scheme}`, () => {
    test.use({ colorScheme: scheme });
    for (const path of new Set([
      ...publicRoutes(),
      ...LOCKED,
      "/spring",
      "/spring/app",
      "/spring/view",
      "/stickers",
    ])) {
      test(`${path} has no WCAG 2.2 AA violations @a11y`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
        // Let the first-load fade finish, so contrast is measured on settled text.
        await expect(page.locator("html")).toHaveAttribute("data-entered", "");
        const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
        expect(
          violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`),
        ).toEqual([]);
      });
    }
    test("/spring/view with a sample loaded has no WCAG 2.2 AA violations @a11y", async ({
      page,
    }) => {
      await page.goto("/spring/view");
      await page.getByRole("button", { name: "Try a sample" }).click();
      await expect(page.getByRole("heading", { name: "Color", level: 2 })).toBeVisible();
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual(
        [],
      );
    });
    test("/stickers with the export panel open has no WCAG 2.2 AA violations @a11y", async ({
      page,
    }) => {
      await page.goto("/stickers");
      await page.getByRole("button", { name: "Export" }).click();
      await expect(page.getByText("Animated", { exact: true })).toBeVisible();
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual(
        [],
      );
    });
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

import { expect, test } from "@playwright/test";

test("Spring runs as its own app, without the site frame", async ({ page }) => {
  await page.goto("/spring");
  await expect(page).toHaveTitle("Spring");
  await expect(page.locator(".site-footer")).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Color" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: /Switch to/ })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/spring$/);
});

test("the project page opens Spring in a new tab, and old share links follow", async ({
  page,
  request,
}) => {
  await page.goto("/projects/spring");
  const open = page.getByRole("link", { name: /Open Spring/ });
  await expect(open).toHaveAttribute("href", "/spring");
  await expect(open).toHaveAttribute("target", "_blank");
  const old = await request.get("/projects/spring?s=abc", { maxRedirects: 0 });
  expect(old.status()).toBe(308);
  expect(old.headers().location).toMatch(/\/spring\?s=abc$/);
});

test("Export downloads everything, or one area from its menu", async ({ page }) => {
  await page.goto("/spring");
  const all = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  expect((await all).suggestedFilename()).toMatch(/\.zip$/);
  await page.getByRole("button", { name: "Export one area" }).click();
  const one = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /Color/ }).click();
  expect((await one).suggestedFilename()).toMatch(/-color\.zip$/);
});

test("data colors reorder with their move buttons", async ({ page }) => {
  await page.goto("/spring");
  const names = page.locator(".spring-strip__rename");
  await expect(names.first()).toBeVisible();
  const first = await names.nth(0).inputValue();
  const second = await names.nth(1).inputValue();
  await page.getByRole("button", { name: `Move ${first} down` }).click();
  await expect(names.nth(0)).toHaveValue(second);
  await expect(names.nth(1)).toHaveValue(first);
});

test("the audit stays reachable at #audit", async ({ page }) => {
  await page.goto("/spring#audit");
  await expect(page.getByRole("dialog", { name: "Audit a system" })).toBeVisible();
});

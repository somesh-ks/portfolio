import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, NDA_SENTINELS } from "../fixtures/sentinels.ts";
import { LOCKED, publicRoutes } from "./routes.ts";

function watchConsole(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("home to experiment to case study, with no console errors", async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/experiments/oklch-token-inspector");
  const sample = page.locator(".inspector__sample");
  const before = await sample.textContent();
  await page
    .getByRole("button", { name: /as text$/ })
    .first()
    .click();
  await expect(sample).not.toHaveText(before ?? "");

  await page.goto("/work/claude-stickers");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const scrubber = page.getByRole("slider").first();
  await scrubber.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(scrubber).toHaveValue("49");

  expect(errors).toEqual([]);
});

test("the hero runner plays, crashes and offers a retry", async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto("/");
  const runner = page.locator(".runner");
  // Space on the page starts the game in view instead of scrolling past it.
  await runner.evaluate((element) => element.scrollIntoView({ block: "center" }));
  const scrolled = await page.evaluate(() => window.scrollY);
  await page.keyboard.press("Space");
  await expect(runner.locator(".runner__prompt")).toHaveCount(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
  await expect(runner.locator(".runner__score")).toContainText(/0000[1-9]|000[1-9]\d/);
  await expect(runner.locator(".runner__over")).toBeVisible({ timeout: 20_000 });
  await expect(runner.locator(".runner__final")).toHaveText(/^\d{5}$/);
  // No Redis in tests: the leaderboard stays hidden and nothing errors.
  await expect(runner.getByLabel("First name")).toHaveCount(0);
  // Space on the focused game starts the next run after a short beat.
  await page.waitForTimeout(700);
  await runner.locator(".runner__screen").press("Space");
  await expect(runner.locator(".runner__over")).toHaveCount(0);
  expect(errors).toEqual([]);
});

// Client-side navigation reuses registered custom elements, which full page
// loads never do. Click in from home and press back for every route.
test("click into every entry and back, with no console errors", async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto("/");
  for (const route of [...publicRoutes().filter((r) => r !== "/" && r !== "/resume"), ...LOCKED]) {
    const link = page.locator(`a[href="${route}"]`).first();
    await expect(link, `home links ${route}`).toHaveCount(1);
    await link.click();
    await expect(page).toHaveURL(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("This page tripped")).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("This page tripped")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("locked case study: wrong password, right password, survives reload", async ({ page }) => {
  await page.goto("/work/royc");
  const body = page.locator("body");
  for (const sentinel of NDA_SENTINELS) await expect(body).not.toContainText(sentinel);

  const password = page.getByLabel("Password");
  await password.fill("not-the-password");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.locator(".gate__error")).toContainText("didn't work");

  await password.fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(body).toContainText("NDA_SENTINEL_ROYC_7f3a9c");

  await page.reload();
  await expect(body).toContainText("NDA_SENTINEL_ROYC_7f3a9c");
  const media = await page.request.get("/api/media/royc/hero.webp");
  expect(media.status()).toBe(200);
});

test("the NDA boundary holds without a session", async ({ request }) => {
  expect((await request.get("/api/media/royc/hero.webp")).status()).toBe(401);
  expect((await request.get("/api/media/luminovo/anything.webp")).status()).toBe(401);
  for (const path of [...LOCKED, "/llms.txt", "/llms-full.txt", ...LOCKED.map((p) => `${p}.md`)]) {
    const text = await (await request.get(path)).text();
    for (const sentinel of NDA_SENTINELS) expect(text, path).not.toContain(sentinel);
  }
});

test("every public route answers Accept: text/markdown", async ({ request }) => {
  for (const path of publicRoutes()) {
    const response = await request.get(path, { headers: { Accept: "text/markdown" } });
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toContain("text/markdown");
    expect((await response.text()).trimStart(), path).toMatch(/^#|^---/);
  }
  const html = await request.get("/");
  expect(html.headers()["vary"] ?? "").toMatch(/accept/i);
});

test("favicon follows the browser scheme, then the site toggle", async ({ page }) => {
  const icons = page.locator('head link[rel="icon"]');
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(icons).toHaveCount(2);
  await expect(icons.and(page.locator('[media*="dark"]'))).toHaveAttribute(
    "href",
    "/favicon-dark.svg",
  );

  // System → light: one icon, pinned to the site theme rather than the browser's.
  await page.getByRole("button", { name: /Switch to light theme/ }).click();
  await expect(icons).toHaveCount(1);
  await expect(icons).toHaveAttribute("href", "/favicon-light.svg");

  const svg = await page.request.get("/favicon-light.svg");
  expect(svg.ok()).toBe(true);
});

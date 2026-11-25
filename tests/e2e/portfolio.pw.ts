import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, NDA_SENTINELS } from "../fixtures/sentinels.ts";
import { homeRoutes, LOCKED, publicRoutes } from "./routes.ts";

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
  // Space on the page scrolls as usual; a click on the game starts it.
  await runner.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await expect(runner.locator(".runner__prompt")).toContainText(/(CLICK|TAP) TO PLAY/);
  await runner.locator(".runner__screen").click();
  await expect(runner.locator(".runner__prompt")).toHaveCount(0);
  await expect(runner.locator(".runner__score")).toContainText(/0000[1-9]|000[1-9]\d/);
  await expect(runner.locator(".runner__over")).toBeVisible({ timeout: 20_000 });
  await expect(runner.locator(".runner__final")).toHaveText(/^\d{5}$/);
  // No Redis in tests: the leaderboard stays hidden and nothing errors.
  await expect(runner.getByLabel("Name", { exact: true })).toHaveCount(0);
  // Space on the focused game starts the next run after a short beat.
  await page.waitForTimeout(700);
  await runner.locator(".runner__screen").press("Space");
  await expect(runner.locator(".runner__over")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("runner shortcuts C, F and M work with nothing focused and after a click", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "keyboard shortcuts are a desktop feature");
  await page.goto("/");
  const runner = page.locator(".runner");
  const sound = runner.locator(".runner__sound");
  const announced = runner.locator("p[aria-live]");
  await runner.evaluate((element) => element.scrollIntoView({ block: "center" }));

  // Nothing focused: the page's own keys reach the game.
  const muted = (await sound.getAttribute("aria-pressed")) === "true" ? "false" : "true";
  await page.keyboard.press("m");
  await expect(sound).toHaveAttribute("aria-pressed", muted);
  await page.keyboard.press("c");
  await expect(announced).not.toBeEmpty();
  const first = await announced.textContent();
  await page.keyboard.press("f");
  await expect(runner).toHaveAttribute("data-expanded", "true");
  await page.keyboard.press("f");
  await expect(runner).not.toHaveAttribute("data-expanded");

  // After clicking a footer button, focus sits on it and the keys still work.
  await runner.locator(".runner__costume").click();
  await expect(announced).not.toHaveText(first ?? "");
  await page.keyboard.press("m");
  await expect(sound).toHaveAttribute("aria-pressed", muted === "true" ? "false" : "true");
});

// Client-side navigation reuses registered custom elements, which full page
// loads never do. Click in from home and press back for every route.
test("click into every entry and back, with no console errors", async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto("/");
  for (const route of homeRoutes()) {
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

test("Cmd+K jumps to a page and runs actions", async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto("/");
  await page.keyboard.press("ControlOrMeta+k");
  const input = page.getByRole("combobox", { name: "Jump to" });
  await expect(input).toBeFocused();
  await input.fill("resume");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/resume$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.keyboard.press("ControlOrMeta+k");
  await input.fill("theme");
  const theme = await page.locator("html").getAttribute("data-theme");
  await input.press("Enter");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", theme ?? "");
  // Reopening while the close animation runs drops the shortcut, so wait for it to finish.
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Arrow keys move the highlight, Enter opens it; Escape closes even with a query typed.
  await page.keyboard.press("ControlOrMeta+k");
  await expect(input).toBeFocused();
  const first = await page.getByRole("option").first().textContent();
  await input.press("ArrowDown");
  await expect(page.getByRole("option").nth(1)).toHaveAttribute("data-highlighted", "");
  // Accents match like Base UI's own filter: "résumé" finds Resume.
  await input.fill("résumé");
  await expect(page.getByRole("option")).toHaveText([/Resume/]);
  await input.fill("zzz");
  await expect(page.getByRole("option")).toHaveCount(0);
  await expect(page.getByText("no match", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(first).toBeTruthy();
  expect(errors).toEqual([]);
});

test("the top bar hides over the hero, then its jump button opens the palette", async ({
  page,
}) => {
  await page.goto("/");
  const jump = page.getByRole("button", { name: "Jump to a page" });
  await expect(jump).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 600));
  await jump.click();
  await expect(page.getByRole("combobox", { name: "Jump to" })).toBeFocused();
});

test("tune toy retunes the page live and puts it back", async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto("/");
  const root = page.locator("html");
  const bio = page.locator(".bio p").first();
  const button = page.locator(".tune-button");

  await button.click();
  const panel = page.getByRole("dialog", { name: "$ tune" });
  await expect(panel).toBeVisible();
  await expect(button).toBeHidden();

  await panel.getByRole("button", { name: "16" }).click();
  await expect(bio).toHaveCSS("font-size", "16px");
  await panel.getByRole("button", { name: "mono" }).click();
  await expect(root).toHaveAttribute("data-tune-type", "mono");
  const hue = panel.getByRole("slider", { name: "hue" });
  await hue.focus();
  await page.keyboard.press("ArrowRight");
  await expect(root).toHaveAttribute("data-tune-hue", "");
  // The panel stays the same size while the page around it changes.
  await expect(panel.locator(".dial__label").first()).toHaveCSS("font-size", "12px");

  // Extremes don't scroll sideways (WCAG 1.4.10).
  const density = panel.getByRole("slider", { name: "density" });
  await density.focus();
  await page.keyboard.press("End");
  const scale = panel.getByRole("slider", { name: "scale" });
  await scale.focus();
  await page.keyboard.press("End");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(button).toBeFocused();
  await expect(bio).toHaveCSS("font-size", "16px");

  await button.click();
  await panel.getByRole("button", { name: "reset" }).click();
  await expect(bio).toHaveCSS("font-size", "14px");
  await expect(root).not.toHaveAttribute("data-tune-type");

  await panel.getByRole("button", { name: "16" }).click();
  await panel.getByRole("link", { name: /made with Spring/ }).click();
  await expect(page).toHaveURL(/\/projects\/spring/);
  await expect(root).not.toHaveAttribute("data-tune");
  expect(errors).toEqual([]);
});

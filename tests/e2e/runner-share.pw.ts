import { expect, test } from "@playwright/test";

test("game over offers a score link, and the link sets the score to beat", async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== "desktop", "Clipboard path; phones get the share sheet");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const runner = page.locator(".runner");
  await runner.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await runner.locator(".runner__screen").click();
  await expect(runner.locator(".runner__over")).toBeVisible({ timeout: 20_000 });
  const final = Number(await runner.locator(".runner__final").textContent());
  await page.keyboard.press("s");
  await expect(runner.getByRole("button", { name: /COPIED/ })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("on Claude Runner.");
  expect(copied).toMatch(new RegExp(`\\?beat=${final}$`));
  // A clicked SHARE hands focus back, so Space still retries.
  await runner.getByRole("button", { name: /SHARE|COPIED/ }).click();
  await expect(runner.locator(".runner__screen")).toBeFocused();
  // Retry opens 600ms after the crash, so a jump held through it can't skip the result.
  await page.waitForTimeout(700);
  await page.keyboard.press("Space");
  await expect(runner.locator(".runner__over")).toHaveCount(0);

  await page.goto("/?beat=1234");
  await expect(page.locator(".runner__hi")).toHaveText("BEAT 01234");
  await page.goto("/?beat=nope");
  await expect(page.locator(".runner__hi")).toContainText("HI SCORE");
});

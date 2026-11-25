import { expect, test } from "@playwright/test";

// The bio pills, footer previews and email tooltip load their Base UI code after
// hydration. These pin what a visitor sees, whenever that code arrives.

test("company pill opens its card on hover and on Enter", async ({ page, isMobile }) => {
  test.skip(isMobile, "hover needs a fine pointer");
  await page.goto("/");
  const pill = page.getByRole("button", { name: "Netlight" });
  await pill.hover();
  await expect(page.locator(".company-card").getByText("Netlight")).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(page.locator(".company-card")).toHaveCount(0);

  await pill.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".company-card").getByText("Netlight")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".company-card")).toHaveCount(0);
  await expect(pill).toBeFocused();
});

test("company pill opens on tap", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch only");
  await page.goto("/");
  const pill = page.getByRole("button", { name: "Netlight" });
  await pill.tap();
  await expect(page.locator(".company-card").getByText("Netlight")).toBeVisible();
});

test("footer previews open on hover, never on touch", async ({ page, isMobile }) => {
  await page.goto("/resume");
  const link = page.getByRole("contentinfo").getByRole("link", { name: "LinkedIn" });
  await expect(link).toHaveAttribute("href", "https://www.linkedin.com/in/someshks/");
  if (isMobile) {
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".contact-card")).toHaveCount(0);
    return;
  }
  await link.hover();
  await expect(page.locator(".contact-card")).toBeVisible();
});

test("email shows the address, then Copied on click", async ({ page, context, isMobile }) => {
  test.skip(isMobile, "clipboard permission is desktop only here");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/resume");
  await page.waitForLoadState("networkidle");
  const email = page.getByRole("contentinfo").getByRole("link", { name: "Email" });
  await email.hover();
  await expect(page.locator(".tooltip")).toContainText("@");
  await email.click();
  await expect(page.locator(".tooltip")).toContainText("Copied");
});

/** Turns off the idle preload, so the card code only starts loading on the visitor's gesture. */
async function noIdlePreload(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    window.requestIdleCallback = () => 0;
  });
  await page.goto("/");
}

test("a mouse resting on a pill while the card code loads still opens it", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "hover needs a fine pointer");
  await noIdlePreload(page);
  await page.getByRole("button", { name: "Netlight" }).hover();
  await expect(page.locator(".company-card").getByText("Netlight")).toBeVisible();
});

test("a click before the card code loads opens it and keeps it open", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "desktop click semantics");
  await noIdlePreload(page);
  await page.getByRole("button", { name: "Netlight" }).click();
  await expect(page.locator(".company-card").getByText("Netlight")).toBeVisible();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(500);
  await expect(page.locator(".company-card").getByText("Netlight")).toBeVisible();
});

test("a tap before the card code loads opens it", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch only");
  await noIdlePreload(page);
  await page.getByRole("button", { name: "Netlight" }).tap();
  await expect(page.locator(".company-card").getByText("Netlight")).toBeVisible();
});

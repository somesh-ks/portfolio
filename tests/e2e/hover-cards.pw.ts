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

test("company pill opens on tap, even straight after load", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch only");
  await page.goto("/", { waitUntil: "commit" });
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

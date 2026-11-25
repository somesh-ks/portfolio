import { expect, test } from "@playwright/test";

test("the sticker studio picks a move, wears a prop and keeps the look in the URL", async ({
  page,
}) => {
  await page.goto("/stickers");
  await expect(page).toHaveTitle("Claude sticker studio");
  await expect(page.locator(".site-footer")).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Static" })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("radio", { name: "Dance" }).check({ force: true });
  await expect(page.getByRole("radio", { name: "Dance" })).toBeChecked();
  await expect(page).toHaveURL(/m=dance/);

  const mug = page.getByRole("button", { name: "Mug" });
  await expect(mug).toBeDisabled();
  await page.getByRole("radio", { name: "Wave" }).check({ force: true });

  const mugOn = page.getByRole("button", { name: "Mug" });
  await mugOn.click();
  await expect(mugOn).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/p=[a-z,]*mug/);
  await mugOn.click();
  await expect(mugOn).toHaveAttribute("aria-pressed", "false");

  const plain = page.getByRole("radio", { name: "Plain" });
  await expect(page.getByRole("radio", { name: "Die-cut" })).toBeChecked();
  await plain.check({ force: true });
  await expect(plain).toBeChecked();
  await expect(page).toHaveURL(/o=0/);

  await page.getByRole("slider", { name: "Frame" }).fill("5");
  await expect(page).toHaveURL(/fr=5/);
});

test("Animated has Play and Pause, and the Export menu serves a PNG", async ({ page }) => {
  await page.goto("/stickers");
  await expect(page.getByRole("button", { name: /^(Play|Pause)$/ })).toHaveCount(0);
  await page.getByRole("tab", { name: "Animated" }).click();
  await expect(page).toHaveURL(/t=animated/);
  const toggle = page.getByRole("button", { name: /^(Play|Pause)$/ });
  await expect(toggle).toBeVisible();
  const label = await toggle.getAttribute("aria-label");
  await toggle.click();
  await expect(toggle).not.toHaveAttribute("aria-label", label ?? "");

  await page.getByRole("tab", { name: "Static" }).click();
  await page.getByRole("button", { name: "More exports" }).click();
  const png = page.getByRole("menuitem", { name: /PNG 512/ });
  const href = await png.getAttribute("href");
  expect(href).toContain("f=png");
  const res = await page.request.get(href ?? "");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
});

import { expect, test, type Page } from "@playwright/test";

const frame = (page: Page) => page.getByRole("slider", { name: "Frame" });
const exportButton = (page: Page) => page.getByRole("button", { name: "Export" });
const href = async (page: Page, name: string | RegExp) =>
  (await page.getByRole("link", { name }).getAttribute("href")) ?? "";
/** The export link's query, as the route reads it. */
const query = async (page: Page, name: string | RegExp) => {
  const h = await href(page, name);
  return new URLSearchParams(h.slice(h.indexOf("?") + 1));
};

async function open(page: Page) {
  await page.goto("/stickers");
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
}

test("the studio has the brand, a strip of Export and theme, and no Static or Animated tabs", async ({
  page,
}) => {
  await page.goto("/stickers");
  await expect(page).toHaveTitle("Claude sticker studio");
  await expect(page.locator(".site-footer")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Claude sticker studio" })).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Shuffle" })).toBeVisible();

  const a = await exportButton(page).boundingBox();
  const b = await page.getByRole("button", { name: /Switch to/ }).boundingBox();
  expect(a && b && Math.abs(a.x + a.width - b.x) <= 1).toBe(true);
  expect(Math.abs((a?.height ?? 0) - (b?.height ?? 1))).toBeLessThanOrEqual(1);
});

test("picks an action, toggles and clears items, and keeps the look in the URL", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("radio", { name: "Dance" }).check({ force: true });
  await expect(page.getByRole("radio", { name: "Dance" })).toBeChecked();
  await expect(page).toHaveURL(/m=dance/);

  // Nothing is ever disabled: the mug is available with every action.
  const mug = page.getByRole("button", { name: "Mug" });
  await expect(mug).toBeEnabled();
  await mug.click();
  await expect(mug).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/p=[a-z,-]*mug/);
  await expect(page.getByRole("heading", { name: "Hand · Mug" })).toBeVisible();
  await mug.click();
  await expect(mug).toHaveAttribute("aria-pressed", "false");

  // The default beanie shows in its section head; × clears the slot.
  await expect(page.getByRole("heading", { name: "Head · Beanie" })).toBeVisible();
  await page.getByRole("button", { name: "Clear head" }).click();
  await expect(page.getByRole("heading", { name: "Head", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear head" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Beanie", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await page.getByRole("button", { name: "Thick" }).click();
  await expect(page).toHaveURL(/o=2/);
  await page.getByRole("button", { name: "Off" }).click();
  await expect(page).toHaveURL(/o=0/);
});

test("Shuffle changes the look", async ({ page }) => {
  await open(page);
  const before = new URL(page.url()).search;
  const shuffle = page.getByRole("button", { name: "Shuffle" });
  await expect(async () => {
    await shuffle.click();
    expect(new URL(page.url()).search).not.toBe(before);
  }).toPass({ timeout: 8_000 });
});

test("the playhead moves while playing and the scrubber pauses on a frame", async ({ page }) => {
  await open(page);
  const count = page.locator(".stickers-count");
  await expect(count).toHaveText(/^\d+ \/ 24$/);
  const first = await frame(page).inputValue();
  await expect(async () => {
    expect(await frame(page).inputValue()).not.toBe(first);
  }).toPass({ timeout: 4_000 });

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  const held = await frame(page).inputValue();
  await page.waitForTimeout(400);
  expect(await frame(page).inputValue()).toBe(held);

  await frame(page).fill("5");
  await expect(count).toHaveText("6 / 24");
  await expect(page).toHaveURL(/fr=5/);

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(page).not.toHaveURL(/fr=/);

  // Scrubbing while playing pauses; Space on the slider plays again.
  await frame(page).fill("9");
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  await frame(page).focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
});

test("the Export panel links to the right files, for the right frame, size and shape", async ({
  page,
}) => {
  await open(page);
  await exportButton(page).click();
  await expect(page.getByText("Animated", { exact: true })).toBeVisible();

  // Playing: the still is the action's hero frame (Wave: 2, shown as 3).
  await expect(page.getByText("Still · frame 3")).toBeVisible();
  const png0 = await query(page, "Download PNG, frame 3");
  expect([png0.get("f"), png0.get("s"), png0.get("fr"), png0.get("sq")]).toEqual([
    "png",
    "512",
    "2",
    null,
  ]);
  const gif0 = await query(page, "Download GIF");
  expect([gif0.get("f"), gif0.get("s")]).toEqual(["gif", "512"]);
  expect((await query(page, "Download animated SVG")).get("f")).toBe("svg");
  expect((await query(page, "Download Lottie JSON")).get("f")).toBe("json");
  expect(await href(page, /^Download still SVG/)).toMatch(/^data:image\/svg\+xml/);

  await page.getByRole("button", { name: "1024" }).click();
  await page.getByRole("button", { name: "Square" }).click();
  await expect(page.getByRole("button", { name: "Square" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  for (const name of ["Download GIF", /^Download PNG/]) {
    const q = await query(page, name);
    expect([q.get("s"), q.get("sq")]).toEqual(["1024", "1"]);
  }
  const res = await page.request.get(await href(page, /^Download PNG/));
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  expect(
    (await page.request.get(await href(page, "Download animated SVG"))).headers()["content-type"],
  ).toContain("image/svg+xml");

  // Scrubbed: the still is the frame on stage.
  await page.keyboard.press("Escape");
  await frame(page).fill("7");
  await exportButton(page).click();
  await expect(page.getByText("Still · frame 8")).toBeVisible();
  expect((await query(page, /^Download PNG/)).get("fr")).toBe("7");
});

for (const scheme of ["light", "dark"] as const) {
  test.describe(scheme, () => {
    test.use({ colorScheme: scheme });

    test(`the Export label stays visible at 375px (${scheme})`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 700 });
      await page.goto("/stickers");
      const label = page.getByRole("button", { name: "Export" });
      await expect(label).toContainText("Export");
      const box = await label.boundingBox();
      expect(box && box.x >= 0 && box.x + box.width <= 375).toBe(true);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });

    test(`the picked tile is marked (${scheme})`, async ({ page }) => {
      await open(page);
      const tile = page.getByRole("button", { name: "Beanie", exact: true });
      await expect(tile).toHaveAttribute("aria-pressed", "true");
      const shadow = await tile.evaluate((el) => getComputedStyle(el).boxShadow);
      expect(shadow).toContain("2px");
    });
  });
}

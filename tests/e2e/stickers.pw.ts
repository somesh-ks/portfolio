import { expect, test, type Page } from "@playwright/test";

const frame = (page: Page) => page.getByRole("slider", { name: "Frame" });
/** Scrubs like a keyboard user: Home, then arrows. React ignores a programmatic value set. */
async function scrubTo(page: Page, n: number) {
  await frame(page).focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < n; i++) await page.keyboard.press("ArrowRight");
  await expect(frame(page)).toHaveValue(String(n));
}
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
  await page.locator(".stickers-tile", { has: page.getByRole("radio", { name: "Dance" }) }).click();
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
  await expect(count).toHaveText(/^Frame \d+ \/ 24$/);
  const first = await frame(page).inputValue();
  await expect(async () => {
    expect(await frame(page).inputValue()).not.toBe(first);
  }).toPass({ timeout: 4_000 });

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  const held = await frame(page).inputValue();
  await page.waitForTimeout(400);
  expect(await frame(page).inputValue()).toBe(held);

  await scrubTo(page, 5);
  await expect(count).toHaveText("Frame 6 / 24");
  await expect(page).toHaveURL(/fr=5/);

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(page).not.toHaveURL(/fr=/);

  // Scrubbing while playing pauses; Space on the slider plays again.
  await scrubTo(page, 9);
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

  // Playing: the still is the action's hero frame (Wave: 3, shown as 4).
  await expect(page.getByText("Still · frame 4")).toBeVisible();
  const png0 = await query(page, "Download PNG, frame 4");
  expect([png0.get("f"), png0.get("s"), png0.get("fr"), png0.get("sq")]).toEqual([
    "png",
    "512",
    "3",
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
  await expect(page.getByText("Animated", { exact: true })).toBeHidden();
  await scrubTo(page, 7);
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
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
      const thumb = tile.locator(".stickers-thumb");
      await expect
        .poll(() => thumb.evaluate((el) => getComputedStyle(el).boxShadow))
        .toContain("2px");
    });
  });
}

for (const [width, height] of [
  [390, 844],
  [1440, 900],
] as const)
  for (const dpr of [1, 2]) {
    test.describe(`seam ${width}x${height} @${dpr}x`, () => {
      test.use({ viewport: { width, height }, deviceScaleFactor: dpr });

      test("the art sits on whole pixels and an animated frame equals the static one", async ({
        page,
      }) => {
        await open(page);
        const art = page.locator(".stickers-art");
        const rect = () =>
          art.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return [r.x, r.y, r.width, r.height];
          });
        for (const v of await rect()) expect(Number.isInteger(v)).toBe(true);

        // Freeze the running animation on frame 5, shoot it, then scrub to frame 5 (a static
        // render of the same frame) and shoot again: every pixel must match, so no seam.
        await art.evaluate((el) => {
          for (const a of el.querySelector("svg")?.getAnimations({ subtree: true }) ?? []) {
            a.pause();
            a.currentTime = (5 / 12) * 1000 + 5;
          }
        });
        const animated = await art.screenshot({ animations: "allow" });
        await scrubTo(page, 5);
        for (const v of await rect()) expect(Number.isInteger(v)).toBe(true);
        const still = await art.screenshot({ animations: "allow" });
        expect(animated.equals(still)).toBe(true);
      });
    });
  }

test("the bar strip clears the title and the window edge; the outline control sits in the sidebar", async ({
  page,
}) => {
  for (const [w, h] of [
    [360, 740],
    [390, 844],
    [1440, 900],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/stickers");
    const strip = (await page.locator(".stickers-strip").boundingBox())!;
    const name = (await page.locator(".stickers .spring-app__name").boundingBox())!;
    expect(strip.x - (name.x + name.width)).toBeGreaterThanOrEqual(8);
    expect(w - (strip.x + strip.width)).toBeGreaterThanOrEqual(15);
    const outline = page.getByRole("heading", { name: "Outline", level: 2 });
    await expect(outline).toBeVisible();
    await expect(page.locator(".stickers-side").getByRole("button", { name: "Thin" })).toHaveCount(
      1,
    );
    await expect(
      page.locator(".stickers-transport").getByRole("button", { name: "Thin" }),
    ).toHaveCount(0);
  }
});

test("the timeline is compact and centred under the sticker", async ({ page }) => {
  await open(page);
  const bar = (await page.locator(".stickers-scrub").boundingBox())!;
  const stage = (await page.locator(".stickers-stage").boundingBox())!;
  expect(bar.width).toBeGreaterThanOrEqual(300);
  expect(bar.width).toBeLessThanOrEqual(420);
  expect(Math.abs(bar.x + bar.width / 2 - (stage.x + stage.width / 2))).toBeLessThanOrEqual(2);
});

test("there is no caption line; tiles are named by tooltip or label", async ({ page }, info) => {
  await page.goto("/stickers");
  await expect(page.locator(".stickers-cap")).toHaveCount(0);
  const tile = page.locator(".stickers-tile", {
    has: page.getByRole("radio", { name: "Run" }),
  });
  if (info.project.name === "mobile") {
    // Touch: every tile has its name under it and no tooltip appears on tap.
    const labels = page.locator(".stickers-label");
    await expect(labels.first()).toBeVisible();
    await expect(tile.locator(".stickers-label")).toHaveText("Run");
    const thumb = (await tile.locator(".stickers-thumb").boundingBox())!;
    const label = (await tile.locator(".stickers-label").boundingBox())!;
    expect(label.y).toBeGreaterThanOrEqual(thumb.y + thumb.height);
    await tile.tap();
    await expect(page.locator(".tooltip")).toHaveCount(0);
  } else {
    await expect(page.locator(".stickers-label").first()).toBeHidden();
    await tile.hover();
    const tip = page.locator(".tooltip", { hasText: "Run" });
    await expect(tip).toBeVisible();
    const t = (await tile.boundingBox())!;
    const p = (await tip.boundingBox())!;
    expect(Math.abs(p.x + p.width / 2 - (t.x + t.width / 2))).toBeLessThanOrEqual(40);
    expect(t.y - (p.y + p.height)).toBeGreaterThanOrEqual(0);
    expect(t.y - (p.y + p.height)).toBeLessThanOrEqual(40);
    // Moving to the next tile shows its name at once.
    await page
      .locator(".stickers-tile", {
        has: page.getByRole("radio", { name: "Jump" }),
      })
      .hover();
    await expect(page.locator(".tooltip", { hasText: "Jump" })).toBeVisible({
      timeout: 150,
    });
  }
});

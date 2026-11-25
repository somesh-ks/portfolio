import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("Spring runs as its own app, without the site frame", async ({ page }) => {
  await page.goto("/spring/app");
  await expect(page).toHaveTitle("Spring app");
  await expect(page.locator(".site-footer")).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Color" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: /Switch to/ })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/spring\/app$/);
});

test("the landing page leads with the skill and opens the app", async ({ page }) => {
  await page.goto("/spring");
  await expect(page).toHaveTitle("Spring");
  await expect(page.getByText("npx skills add somesh-ks/skills --skill spring")).toBeVisible();
  for (const name of ["Read what you have", "Make the one you want"])
    await expect(page.getByRole("heading", { name })).toBeVisible();
  // The Make tile runs on the real engine: Spring's label passes on the brand.
  await expect(page.getByText("Spring's label")).toBeVisible();
  // Pause stops everything that moves (WCAG 2.2.2).
  const pause = page.getByRole("button", { name: "Pause" });
  if (await pause.isVisible()) {
    await pause.click();
    await expect(page.getByRole("button", { name: "Play" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
  await page.getByRole("link", { name: "Open app" }).first().click();
  await page.waitForURL(/\/spring\/app$/);
});

test("old app links land in the app", async ({ page, request }) => {
  for (const q of ["s=abc", "primary=%23e11d48", "name=X&font=Inter"]) {
    const old = await request.get(`/spring?${q}`, { maxRedirects: 0 });
    expect(old.status(), q).toBe(308);
    expect(old.headers().location, q).toBe(`/spring/app?${q}`);
  }
  await page.goto("/spring#audit");
  await page.waitForURL(/\/spring\/app#audit$/);
});

test("the old project page and share links 308 to Spring", async ({ request }) => {
  for (const [from, to] of [
    ["/projects/spring", /\/spring$/],
    ["/projects/spring?s=abc", /\/spring\/app\?s=abc$/],
    ["/projects/spring.md", /\/spring\.md$/],
  ] as const) {
    const old = await request.get(from, { maxRedirects: 0 });
    expect(old.status()).toBe(308);
    expect(old.headers().location).toMatch(to);
  }
});

test("Export downloads everything, or one area from its menu", async ({ page }) => {
  await page.goto("/spring/app");
  const all = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  expect((await all).suggestedFilename()).toMatch(/\.zip$/);
  await page.getByRole("button", { name: "Export, import and reset" }).click();
  const one = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /Color/ }).click();
  expect((await one).suggestedFilename()).toMatch(/-color\.zip$/);
});

test("data colors reorder with their move buttons", async ({ page }) => {
  await page.goto("/spring/app");
  await page.locator(".spring-reveal > summary").click();
  const names = page.locator(".spring-strip__rename");
  await expect(names.first()).toBeVisible();
  const first = await names.nth(0).inputValue();
  const second = await names.nth(1).inputValue();
  await page.getByRole("button", { name: `Move ${first} down` }).click();
  await expect(names.nth(0)).toHaveValue(second);
  await expect(names.nth(1)).toHaveValue(first);
});

test("the audit stays reachable at #audit", async ({ page }) => {
  await page.goto("/spring/app#audit");
  await expect(page.getByRole("dialog", { name: "Audit a system" })).toBeVisible();
});

test("the color page opens its charts in Preview", async ({ page }) => {
  await page.goto("/spring/app");
  await page.locator(".spring-reveal > summary").click();
  await page.getByRole("button", { name: "See them in charts" }).click();
  await expect(page.getByRole("button", { name: "Preview" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("Change vs last month")).toBeVisible();
});

test("each browser keeps its own system until Start over", async ({ page }) => {
  await page.goto("/spring/app");
  await page.locator(".spring-reveal > summary").click();
  const names = page.locator(".spring-strip__rename");
  const first = await names.nth(0).inputValue();
  const second = await names.nth(1).inputValue();
  await page.getByRole("button", { name: `Move ${first} down` }).click();
  await expect(page).toHaveURL(/\?s=/);
  await page.goto("/spring/app");
  await expect(names.nth(0)).toHaveValue(second);
  await page.getByRole("button", { name: "Export, import and reset" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("menuitem", { name: "Start over" }).click();
  await expect(names.nth(0)).toHaveValue(first);
  await expect(page).not.toHaveURL(/\?s=/);
  await page.reload();
  await expect(names.nth(0)).toHaveValue(first);
});

test("a seed link loads its system", async ({ page }) => {
  await page.goto("/spring/app?primary=%23e11d48&name=Seedtest");
  await page.getByRole("tab", { name: "Tokens" }).click();
  await expect(page.getByLabel("System name")).toHaveValue("Seedtest");
});

test("Export gives spring.json, valid and self-describing", async ({ page }) => {
  await page.goto("/spring/app");
  await page.getByRole("button", { name: "Export, import and reset" }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: /spring\.json/ }).click();
  const file = await (await dl).path();
  const json = JSON.parse(readFileSync(file, "utf8"));
  expect(json.$schema).toMatch(/schema\.json$/);
  expect(typeof json.name).toBe("string");
});

test("Import reads a spring.json", async ({ page }) => {
  await page.goto("/spring/app");
  await page.getByRole("button", { name: "Export, import and reset" }).click();
  await page.getByRole("menuitem", { name: /Import/ }).click();
  const dialog = page.getByRole("dialog", { name: "Import" });
  await dialog
    .getByLabel(/Paste or drop/)
    .fill(
      JSON.stringify({ $schema: "https://someshks.com/spring/schema.json", name: "Importtest" }),
    );
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog.getByText("Imported spring.json.")).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await page.getByRole("tab", { name: "Tokens" }).click();
  await expect(page.getByLabel("System name")).toHaveValue("Importtest");
});

test("Import turns CSS variables into a starting point", async ({ page }) => {
  await page.goto("/spring/app");
  await page.getByRole("button", { name: "Export, import and reset" }).click();
  await page.getByRole("menuitem", { name: /Import/ }).click();
  const dialog = page.getByRole("dialog", { name: "Import" });
  await dialog
    .getByLabel(/Paste or drop/)
    .fill(
      ":root{--background:0 0% 100%;--foreground:222 47% 11%;--primary:346 77% 49%;--radius:0.5rem}",
    );
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  await expect(dialog.getByText("Closest match loaded.")).toBeVisible();
});

const importText = async (page: import("@playwright/test").Page, text: string) => {
  await page.getByRole("button", { name: "Export, import and reset" }).click();
  await page.getByRole("menuitem", { name: /Import/ }).click();
  const dialog = page.getByRole("dialog", { name: "Import" });
  await dialog.getByLabel(/Paste or drop/).fill(text);
  await dialog.getByRole("button", { name: "Import", exact: true }).click();
  return dialog;
};

test("Import sends a DTCG tokens.json and a view file to the audit, with Undo", async ({
  page,
}) => {
  await page.goto("/spring/app?primary=%23e11d48&name=Before");
  const dtcg = {
    $schema: "https://www.designtokens.org/schemas/2025.10/format.json",
    color: { primary: { $type: "color", $value: "#16a34a" } },
  };
  let dialog = await importText(page, JSON.stringify(dtcg));
  await expect(dialog.getByText("Closest match loaded.")).toBeVisible();
  await expect(dialog.getByText("Imported spring.json.")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Undo" }).click();
  await dialog.getByRole("button", { name: "Close" }).click();
  await page.getByRole("tab", { name: "Tokens" }).click();
  await expect(page.getByLabel("System name")).toHaveValue("Before");

  const view = {
    $schema: "https://someshks.com/spring/view.schema.json",
    v: 1,
    name: "Viewfile",
    modes: ["light"],
    tokens: { primary: { light: "#16a34a" }, background: { light: "#ffffff" } },
  };
  dialog = await importText(page, JSON.stringify(view));
  await expect(dialog.getByText("Closest match loaded.")).toBeVisible();
});

test("Start over drops seed params from the URL", async ({ page }) => {
  await page.goto("/spring/app?primary=%23e11d48&name=Seedtest&font=Inter");
  await page.getByRole("button", { name: "Export, import and reset" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("menuitem", { name: "Start over" }).click();
  await expect.poll(() => new URL(page.url()).search).toBe("");
});

test("a curve handle follows the pointer", async ({ page }) => {
  await page.goto("/spring/app");
  await page.locator("summary", { hasText: "scale" }).click();
  const plot = page.locator(".spring-curve__plot");
  await plot.scrollIntoViewIfNeeded();
  const field = page.getByLabel("cubic-bezier");
  const hit = page.locator(".spring-curve__hit").first();
  const from = (await hit.boundingBox())!;
  const box = (await plot.boundingBox())!;
  // viewBox -8 -8 116 116 is square and fitted inside the element: scale and offset.
  const k = Math.min(box.width, box.height) / 116;
  const ox = box.x + (box.width - 116 * k) / 2 + 8 * k;
  const oy = box.y + (box.height - 116 * k) / 2 + 8 * k;
  const target = { x: ox + 0.3 * 100 * k, y: oy + (1 - 0.7) * 100 * k };
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await page.mouse.up();
  const [x, y] = (await field.inputValue()).split(",").map(Number);
  expect(Math.abs(x! - 0.3)).toBeLessThan(0.03);
  expect(Math.abs(y! - 0.7)).toBeLessThan(0.03);
});

test("a Dial's value field takes typed digits after Enter without appending", async ({ page }) => {
  await page.goto("/spring/app");
  const field = page.getByLabel("hue, type a value");
  await field.scrollIntoViewIfNeeded();
  await field.focus();
  await page.keyboard.type("30");
  await page.keyboard.press("Enter");
  await page.keyboard.type("5");
  await expect(field).toHaveValue("5");
  await page.keyboard.press("Enter");
  await expect(field).toHaveValue("5");
  await expect(page.getByLabel("hue", { exact: true })).toHaveValue("5");
});

test("a Dial scrubs from its value on drag and sets the point on a plain click", async ({
  page,
}) => {
  await page.goto("/spring/app?primary=%232563eb");
  const slider = page.getByLabel("hue", { exact: true });
  const row = page.locator(".dial").filter({ has: slider });
  await row.scrollIntoViewIfNeeded();
  const box = (await row.boundingBox())!;
  const y = box.y + box.height / 2;
  const start = Number(await slider.inputValue());
  // Pressing near the left edge doesn't jump; dragging moves from the current value.
  await page.mouse.move(box.x + 10, y);
  await page.mouse.down();
  await expect(slider).toHaveValue(String(start));
  await page.mouse.move(box.x + 10 + box.width / 4, y, { steps: 5 });
  await page.mouse.up();
  const scrubbed = Number(await slider.inputValue());
  expect(scrubbed).toBeGreaterThan(start);
  await expect(slider).toBeFocused();
  // A click without a drag sets the value at that point.
  await page.mouse.click(box.x + 2, y);
  expect(Number(await slider.inputValue())).toBeLessThan(scrubbed);
});

test("dark chroma with a gray brand never shows NaN", async ({ page }) => {
  const errors: Error[] = [];
  page.on("pageerror", (e) => errors.push(e));
  // Dark through the system theme: clicking the toggle in a loop raced its
  // view transition on slow runners and could land one click past dark.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/spring/app?primary=%23808080");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const field = page.getByLabel("chroma, dark, type a value");
  await field.scrollIntoViewIfNeeded();
  await field.focus();
  await page.keyboard.type("0.05");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  expect(await page.locator("body").innerText()).not.toContain("NaN");
  expect(await page.locator("body").innerHTML()).not.toContain("NaN");
  expect(errors.map((e) => e.message)).toEqual([]);
});

test("the share link comes first and the Export button confirms it", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/spring/app");
  await page.getByRole("button", { name: "Export, import and reset" }).click();
  await expect(page.getByRole("menuitem").first()).toHaveText("Copy share link");
  await page.getByRole("menuitem", { name: "Copy share link" }).click();
  await expect(page.getByText("Link copied")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("/spring/app?s=");
  await expect(page.getByRole("link", { name: "Spring" })).toHaveAttribute("href", "/spring");
});

test("a strip is one tab stop; arrows walk its steps", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "keyboard navigation is a desktop check");
  await page.goto("/spring/app");
  const strip = page.getByRole("toolbar", { name: "primary steps" });
  await expect(strip.locator('button[tabindex="0"]')).toHaveCount(1);
  await strip.locator("button").first().focus();
  await page.keyboard.press("End");
  await expect(strip.locator("button").last()).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(strip.locator("button").nth(10)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("toolbar", { name: "primary steps" }).locator(":focus")).toHaveCount(
    0,
  );
});

test("a picked status color clears back to auto from its picker", async ({ page }) => {
  await page.goto("/spring/app");
  const field = page.getByRole("textbox", { name: "danger color, blank for auto" });
  await expect(field).toHaveCount(0);
  await page.getByRole("button", { name: "Pick danger color" }).click();
  const hex = page.getByRole("textbox", { name: "danger color", exact: true });
  await hex.fill("#ff00ff");
  await hex.press("Enter");
  await expect(field).toHaveCount(1);
  await hex.fill("");
  await hex.press("Enter");
  await expect(field).toHaveCount(0);
});

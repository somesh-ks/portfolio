import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { extract, type View } from "../../src/lib/spring/tokens.ts";

const shadcn = readFileSync(join(import.meta.dirname, "../fixtures/audit/shadcn.css"), "utf8");

const link = (view: unknown) =>
  deflateRawSync(Buffer.from(JSON.stringify(view))).toString("base64url");

test("an empty page shows a sample, and the mode switch changes a swatch", async ({ page }) => {
  await page.goto("/spring/view");
  await page.getByRole("button", { name: "Try a sample" }).click();
  await expect(page.getByRole("heading", { name: "Color", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Contrast", level: 2 })).toBeVisible();
  const bg = page.getByText("background", { exact: true }).first();
  const value = bg.locator("xpath=following-sibling::*[contains(@class,'spring-view__value')]");
  const light = await value.textContent();
  await page.getByRole("group", { name: "Mode" }).getByRole("button", { name: "dark" }).click();
  await expect(value).not.toHaveText(light ?? "");
});

test("a #d= link renders the system, clears the hash, and survives a reload", async ({ page }) => {
  const view: View = extract([{ path: "shadcn.css", text: shadcn }], "Linktest");
  const count = Object.keys(view.tokens).length;
  await page.goto(`/spring/view#d=${link(view)}`);
  await expect(page.getByRole("heading", { level: 1, name: "Linktest" })).toBeVisible();
  await expect(page.getByText(`${count} tokens`)).toBeVisible();
  await expect.poll(() => new URL(page.url()).hash).toBe("");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Linktest" })).toBeVisible();
  await expect(page.getByText(`${count} tokens`)).toBeVisible();
});

test("a broken #d= link says so", async ({ page }) => {
  await page.goto("/spring/view#d=not-a-real-payload");
  await expect(page.getByRole("alert").filter({ hasText: /cut off or broken/i })).toBeVisible();
});

test("hostile values render without page errors", async ({ page }) => {
  const errors: Error[] = [];
  page.on("pageerror", (e) => errors.push(e));
  const evil = {
    v: 1,
    name: "Evil",
    modes: ["light"],
    tokens: {
      "bg-image": { light: "url(https://example.invalid/x.png)" },
      "color-ok": { light: "#336699" },
      __proto__: { light: "red" },
    },
  };
  // JSON.stringify drops a literal __proto__ key, so write it by hand.
  const json = JSON.stringify(evil).replace(
    '"tokens":{',
    '"tokens":{"__proto__":{"light":"red"},"constructor":{"light":"blue"},',
  );
  const payload = deflateRawSync(Buffer.from(json)).toString("base64url");
  await page.goto(`/spring/view#d=${payload}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Measured and drawn: the color shows, the url() value never does.
  await expect(page.getByRole("button", { name: /^color-ok / })).toBeVisible();
  await expect(page.getByRole("button", { name: /bg-image/ })).toHaveCount(0);
  expect(errors.map((e) => e.message)).toEqual([]);
});

test("Clean up in Spring lands on /spring/app?s=", async ({ page }) => {
  await page.goto("/spring/view");
  await page.getByRole("button", { name: "Try a sample" }).click();
  await page.getByRole("button", { name: "Clean up in Spring" }).click();
  await page.waitForURL(/\/spring\/app\?s=/);
});

test("the mode matching the site theme opens first, and bad lengths show raw", async ({ page }) => {
  const view = {
    v: 1,
    name: "Modes",
    modes: ["dark", "light"],
    tokens: {
      background: { dark: "#000000", light: "#ffffff" },
      "space-ok": { dark: "8px", light: "8px" },
      "space-bad": { dark: "calc(8px + 1)", light: "calc(8px + 1)" },
    },
  };
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`/spring/view#d=${link(view)}`);
  const modes = page.getByRole("group", { name: "Mode" });
  await expect(modes.getByRole("button", { name: "light" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const space = page.getByRole("region", { name: "Space" });
  await expect(space.getByText("8px", { exact: true })).toBeVisible();
  await expect(space.getByText("calc(8px + 1)", { exact: true })).toBeVisible();
  await expect(space.getByText("16px")).toHaveCount(0);
});

test("Spring's pages hand agents the Spring contract", async ({ request }) => {
  for (const path of ["/spring", "/spring/app", "/spring/view", "/spring.md"]) {
    const response = await request.get(path, { headers: { Accept: "text/markdown" } });
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toContain("text/markdown");
    expect(await response.text(), path).toMatch(/^# Spring/);
  }
});

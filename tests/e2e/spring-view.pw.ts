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
  await page.waitForTimeout(300);
  expect(errors.map((e) => e.message)).toEqual([]);
});

test("Rebuild in Spring lands on /spring?s=", async ({ page }) => {
  await page.goto("/spring/view");
  await page.getByRole("button", { name: "Try a sample" }).click();
  await page.getByRole("button", { name: "Rebuild in Spring" }).click();
  await page.waitForURL(/\/spring\?s=/);
});

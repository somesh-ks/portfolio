/**
 * One-off: screenshots each company's public homepage and writes a small
 * WebP thumbnail to public/previews/<id>.webp for the inline hover previews.
 * Thumbnails are committed, so nothing is fetched from third parties at runtime.
 * Usage: bun scripts/capture-previews.ts [id ...]
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const TARGETS: Record<string, string> = {
  netlight: "https://www.netlight.com",
  anthropic: "https://www.anthropic.com",
  rollsroyce: "https://www.rolls-roycemotorcars.com",
  mercedes: "https://group.mercedes-benz.com/en/",
  royc: "https://www.roycgroup.com",
  wfp: "https://www.wfp.org/who-we-are",
  luminovo: "https://luminovo.com",
  oyo: "https://www.oyorooms.com",
  stripe: "https://stripe.com",
};

/** Cookie banners would dominate a 272px thumbnail. Hide them visually for
 * the screenshot only; nothing on the site is clicked or consented to. */
async function hideConsentBanners(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content: `[id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i],
      [id*="onetrust" i], [id*="usercentrics" i], #CybotCookiebotDialog, [aria-label*="cookie" i] {
      display: none !important; }
      html, body { overflow: auto !important; }`,
  });
  // Banners without telltale class names: hide fixed overlays that mention cookies.
  await page.evaluate(() => {
    for (const element of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
      const position = getComputedStyle(element).position;
      if (
        (position === "fixed" || position === "sticky") &&
        /cookie/i.test(element.innerText ?? "")
      ) {
        element.style.setProperty("display", "none", "important");
      }
    }
    for (const host of Array.from(document.querySelectorAll("*")).filter(
      (node) => node.shadowRoot,
    )) {
      if (/cookie|consent/i.test(host.shadowRoot?.textContent ?? ""))
        (host as HTMLElement).style.display = "none";
    }
  });
  await page.waitForTimeout(300);
}

const only = process.argv.slice(2);
mkdirSync("public/previews", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});
for (const [id, url] of Object.entries(TARGETS)) {
  if (only.length && !only.includes(id)) continue;
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "load", timeout: 45_000 });
    await page.waitForTimeout(2500);
    await hideConsentBanners(page);
    const png = await page.screenshot({ type: "png" });
    await sharp(png).resize(560, 350).webp({ quality: 72 }).toFile(`public/previews/${id}.webp`);
    console.warn(`ok ${id}`);
  } catch (error) {
    console.error(`failed ${id}: ${(error as Error).message.split("\n")[0]}`);
  } finally {
    await page.close();
  }
}
await browser.close();

/**
 * One-off: captures the small hover thumbnails for homepage rows and writes
 * public/thumbs/<slug>.webp. Thumbnails are committed; nothing is fetched at runtime.
 * Sources are an explicit allowlist. Locked case studies (ROYC, Luminovo) reuse
 * the public company-homepage preview and are never captured from their pages.
 * Targets marked `dark` are captured again in dark mode as <slug>.dark.webp.
 * Usage: bun run dev, then bun scripts/capture-thumbs.ts [slug ...]
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const LOCAL = process.env.BASE_URL ?? "http://localhost:3000";

const REDACTED = `<style>body{background:#fafaf9;color:#171717}@media (prefers-color-scheme:dark){body{background:#0c0c0c;color:#ededed}}</style>
<body style="margin:0;display:grid;place-items:center;height:100vh;font:28px/1.6 ui-monospace,monospace">
<pre style="margin:0">NAME     ██████ ████████
PHONE    +91 ██████████
ADDRESS  ███ ████ ██████
         ██████████ ███
PAN      █████████

STATUS   removal sent ✓</pre></body>`;

/** url, plus the element to clip to when the visual sits below the header. */
const TARGETS: Record<
  string,
  { url: string; clip?: string; click?: string; html?: string; dark?: boolean; themeKey?: string }
> = {
  // Projects
  "interface-mechanics": {
    url: `${LOCAL}/projects/interface-mechanics`,
    clip: ".toy, .stage, pre",
  },
  // Rows that link out show the destination itself.
  // Its theme is a stored choice (dark by default), not the system setting.
  "singularity-design-system": {
    url: "https://design.singularityfm.app",
    dark: true,
    themeKey: "design:theme",
  },
  "singularity-podcast": { url: "https://news.someshks.com", dark: true },
  spring: { url: `${LOCAL}/spring`, dark: true },
  // The app sits behind Cloudflare Access, so a redacted record drawn here.
  traceless: { url: "about:blank", html: REDACTED, dark: true },
  tide: { url: "https://tide.someshks.com" },
  // Experiments
  "claude-runner": { url: `${LOCAL}/experiments/claude-runner`, clip: ".runner__screen" },
  "claude-animated-svgs": {
    url: `${LOCAL}/experiments/claude-animated-svgs`,
    clip: ".stage__canvas",
  },
  "oklch-token-inspector": { url: `${LOCAL}/experiments/oklch-token-inspector`, clip: ".toy" },
  "agentic-stream-states": {
    url: `${LOCAL}/experiments/agentic-stream-states`,
    clip: ".toy",
    click: ".toy__bar button",
  },
  // Writing (public only)
  "claude-stickers": { url: `${LOCAL}/work/claude-stickers`, clip: ".toy, .stage" },
  "building-agentic-design-system": {
    url: `${LOCAL}/work/building-agentic-design-system`,
    clip: ".toy, .stage, pre",
  },
  "graphic-comic-making-from-novels": {
    url: `${LOCAL}/work/graphic-comic-making-from-novels`,
    clip: ".toy, .stage, pre",
  },
};

/** Locked case studies: the public company homepage, already captured for the bio. */
const FROM_PREVIEWS = { royc: "royc", luminovo: "luminovo" } as const;

const only = process.argv.slice(2);
const wanted = (slug: string) => !only.length || only.includes(slug);
mkdirSync("public/thumbs", { recursive: true });

for (const [slug, company] of Object.entries(FROM_PREVIEWS)) {
  if (!wanted(slug)) continue;
  await sharp(`public/previews/${company}.webp`)
    .resize(320, 200)
    .webp({ quality: 72 })
    .toFile(`public/thumbs/${slug}.webp`);
  console.warn(`ok ${slug} (company preview)`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const scheme of ["light", "dark"] as const) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: scheme,
    reducedMotion: "reduce",
    // Singularity offers to switch time zones when yours isn't Berlin's.
    timezoneId: "Europe/Berlin",
  });
  for (const [slug, target] of Object.entries(TARGETS)) {
    if (!wanted(slug) || (scheme === "dark" && !target.dark)) continue;
    const out = `public/thumbs/${slug}${scheme === "dark" ? ".dark" : ""}.webp`;
    const page = await context.newPage();
    const { themeKey } = target;
    if (themeKey) {
      await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [themeKey, scheme] as const);
    }
    try {
      if (target.html) await page.setContent(target.html);
      else await page.goto(target.url, { waitUntil: "load", timeout: 45_000 });
      if (target.click) await page.locator(target.click).first().click();
      await page.waitForTimeout(target.click ? 4000 : 2000);
      const element = target.clip ? page.locator(target.clip).first() : undefined;
      const png =
        element && (await element.count())
          ? await element.screenshot({ type: "png" })
          : await page.screenshot({ type: "png" });
      await sharp(png)
        .resize(
          320,
          200,
          element
            ? { fit: "contain", background: scheme === "dark" ? "#0c0c0c" : "#fafaf9" }
            : { fit: "cover", position: "top" },
        )
        .webp({ quality: 72 })
        .toFile(out);
      console.warn(`ok ${out}`);
    } catch (error) {
      console.error(`failed ${out}: ${(error as Error).message.split("\n")[0]}`);
    } finally {
      await page.close();
    }
  }
  await context.close();
}
await browser.close();

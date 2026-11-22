/**
 * LCP and INP under throttled 4G with a 4x slower CPU, the way DevTools does it.
 * Not a CI gate: shared runners make timings noisy. Run by hand after a change:
 *   bun run build && bun run start   # then, in another shell
 *   bun run perf [base-url]          # default http://localhost:3000
 * Set CHROMIUM_PATH to use a specific Chrome binary.
 */
import { chromium, type Page } from "@playwright/test";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PAGES = ["/", "/work/claude-stickers", "/experiments/oklch-token-inspector", "/resume"];
const RUNS = 3;
const BUDGET = { lcp: 2500, inp: 200 }; // web.dev "good" thresholds, in ms

// DevTools "Fast 4G" preset.
const NETWORK = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
};

async function measure(page: Page, path: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", NETWORK);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => {
    const w = window as unknown as { __lcp: number; __inp: number };
    w.__lcp = 0;
    w.__inp = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) w.__lcp = entry.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) w.__inp = Math.max(w.__inp, entry.duration);
    }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  });
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  // One interaction per page: the theme toggle exists everywhere, then Cmd+K and Escape.
  await page.locator(".site-footer button[aria-label*='theme']").click();
  await page.keyboard.press("ControlOrMeta+k");
  await page.locator(".palette input").waitFor();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const w = window as unknown as { __lcp: number; __inp: number };
    return { lcp: Math.round(w.__lcp), inp: Math.round(w.__inp) };
  });
}

const median = (values: number[]) => values.toSorted((a, b) => a - b)[values.length >> 1] ?? 0;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
let failed = false;
for (const path of PAGES) {
  const runs = [];
  for (let run = 0; run < RUNS; run++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    runs.push(await measure(await context.newPage(), path));
    await context.close();
  }
  const lcp = median(runs.map((r) => r.lcp));
  const inp = median(runs.map((r) => r.inp));
  const ok = lcp <= BUDGET.lcp && inp <= BUDGET.inp;
  failed ||= !ok;
  console.warn(`${ok ? "ok  " : "SLOW"} ${path.padEnd(38)} LCP ${lcp} ms  INP ${inp} ms`);
}
await browser.close();
process.exit(failed ? 1 : 0);

/**
 * Build step: fetch the public contribution calendar and cache it for the
 * footer's GitHub card. A failure keeps the last cache (or none) and never
 * fails the build; the card then shows without its grid.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { CACHE_FILE, CONTRIBUTIONS_URL, parseContributions } from "../src/lib/github-contributions";

try {
  const response = await fetch(CONTRIBUTIONS_URL, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = parseContributions(await response.text());
  if (!data) throw new Error("no calendar cells in the page");
  mkdirSync(dirname(CACHE_FILE), { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(data));
  console.warn(`github contributions: ${data.total} in ${data.levels.length} days`);
} catch (error) {
  console.warn(`github contributions skipped: ${(error as Error).message}`);
}

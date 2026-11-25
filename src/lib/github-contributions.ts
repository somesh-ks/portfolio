/**
 * Somesh's public GitHub contribution calendar, for the footer preview card.
 * `scripts/github-contributions.ts` fetches it at build time (no token) and
 * writes CACHE_FILE; pages read that file while they prerender, so every page
 * stays static. No file, or a page GitHub changed, means a card without a grid.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface Contributions {
  /** Contributions in the calendar's year. */
  total: number;
  /** One digit (0-4) per day, oldest first, starting on a Sunday. */
  levels: string;
}

export const CONTRIBUTIONS_URL = "https://github.com/users/somesh-ks/contributions";
export const CACHE_FILE = join(process.cwd(), ".cache", "github-contributions.json");

/** Reads the cells GitHub's calendar HTML draws: `<td data-date data-level>`. */
export function parseContributions(html: string): Contributions | null {
  const days: [string, string][] = [];
  for (const [cell] of html.matchAll(/<td\b[^>]*ContributionCalendar-day[^>]*>/g)) {
    const date = /data-date="(\d{4}-\d{2}-\d{2})"/.exec(cell)?.[1];
    const level = /data-level="([0-4])"/.exec(cell)?.[1];
    if (date && level) days.push([date, level]);
  }
  if (days.length < 7) return null;
  days.sort(([a], [b]) => (a < b ? -1 : 1));
  // Start on a Sunday so the grid's rows are weekdays, as on GitHub.
  const first = days.findIndex(([date]) => new Date(`${date}T00:00:00Z`).getUTCDay() === 0);
  const levels = days
    .slice(Math.max(first, 0))
    .map(([, level]) => level)
    .join("");
  let total = 0;
  for (const [, count] of html.matchAll(/>\s*(\d+) contributions? on /g)) total += Number(count);
  return { total, levels };
}

export function readContributions(): Contributions | null {
  try {
    const data = JSON.parse(readFileSync(CACHE_FILE, "utf8")) as Contributions;
    return /^[0-4]+$/.test(data.levels) && Number.isFinite(data.total) ? data : null;
  } catch {
    return null;
  }
}

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
  /** When the build fetched it (ISO). Older than MAX_AGE_DAYS and the grid is dropped. */
  fetchedAt: string;
}

const MAX_AGE_DAYS = 30;

export const CONTRIBUTIONS_URL = "https://github.com/users/somesh-ks/contributions";
export const CACHE_FILE = join(process.cwd(), ".cache", "github-contributions.json");

/** Reads the cells GitHub's calendar HTML draws: `<td data-date data-level>`. */
export function parseContributions(html: string, now = new Date()): Contributions | null {
  // Tooltips carry the counts: <tool-tip for="<cell id>">3 contributions on …</tool-tip>.
  const counts = new Map<string, number>();
  for (const [, id, count] of html.matchAll(
    /<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>\s*([\d,]+) contributions? on /g,
  )) {
    counts.set(id!, Number(count!.replaceAll(",", "")));
  }
  const days: { date: string; level: string; id: string }[] = [];
  for (const [cell] of html.matchAll(/<td\b[^>]*ContributionCalendar-day[^>]*>/g)) {
    const date = /data-date="(\d{4}-\d{2}-\d{2})"/.exec(cell)?.[1];
    const level = /data-level="([0-4])"/.exec(cell)?.[1];
    const id = /\bid="([^"]+)"/.exec(cell)?.[1] ?? "";
    if (date && level) days.push({ date, level, id });
  }
  if (days.length < 7) return null;
  days.sort((a, b) => (a.date < b.date ? -1 : 1));
  // Start on a Sunday so the grid's rows are weekdays, as on GitHub.
  const first = days.findIndex(({ date }) => new Date(`${date}T00:00:00Z`).getUTCDay() === 0);
  const shown = days.slice(Math.max(first, 0));
  return {
    total: shown.reduce((sum, { id }) => sum + (counts.get(id) ?? 0), 0),
    levels: shown.map(({ level }) => level).join(""),
    fetchedAt: now.toISOString(),
  };
}

let cached: Contributions | null | undefined;

export function readContributions(): Contributions | null {
  if (cached !== undefined) return cached;
  try {
    const data = JSON.parse(readFileSync(CACHE_FILE, "utf8")) as Contributions;
    const age = (Date.now() - Date.parse(data.fetchedAt)) / 86_400_000;
    cached =
      /^[0-4]+$/.test(data.levels) && Number.isFinite(data.total) && age < MAX_AGE_DAYS
        ? data
        : null;
  } catch {
    cached = null;
  }
  return cached;
}

/** "Beat my score" links: /?beat=36 shows BEAT 00036 in place of the high score. */

const MAX = 99_999;
const pad = (value: number) => String(value).padStart(5, "0");

/** The score to beat from a query string, or null when it's missing or not a plausible score. */
export function parseBeat(search: string): number | null {
  const raw = new URLSearchParams(search).get("beat");
  if (!raw || !/^\d{1,5}$/.test(raw)) return null;
  const value = Number(raw);
  return value > 0 && value <= MAX ? value : null;
}

/** The page's own address with ?beat=<score>, other params dropped. */
export function beatUrl(href: string, score: number): string {
  const url = new URL(href);
  url.search = `?beat=${Math.min(Math.max(0, Math.floor(score)), MAX)}`;
  url.hash = "";
  return url.toString();
}

/** The line that goes with the link; it gloats when it beat a shared score. */
export function shareText(score: number, beaten: number | null): string {
  return beaten !== null && score > beaten
    ? `I beat ${pad(beaten)} with ${pad(score)} on Claude Runner. Your turn:`
    : `I scored ${pad(score)} on Claude Runner. Your turn:`;
}

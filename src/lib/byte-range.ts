/**
 * Byte ranges for gated media. Safari will not play video without 206
 * responses, and a Vercel function response must stay under 4.5 MB, so
 * every slice is capped. Browsers ask for the rest as playback continues.
 */
export const MAX_CHUNK = 3 * 1024 * 1024;

export type ByteRange = { start: number; end: number } | "unsatisfiable" | null;

/** Parses a single `bytes=` range against `size`. Returns null for a full-body request. */
export function parseRange(header: string | null, size: number, maxChunk = MAX_CHUNK): ByteRange {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return null;
  let start: number;
  let end: number;
  if (match[1] === "") {
    // Suffix range: the last N bytes.
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (start >= size || start > end) return "unsatisfiable";
  return { start, end: Math.min(end, start + maxChunk - 1) };
}

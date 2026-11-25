export interface Entry {
  name: string;
  score: number;
}

export interface Row {
  rank: number;
  /** null is the visitor's own row, waiting for a name. */
  entry: Entry | null;
  you: boolean;
}

/**
 * A few leaderboard rows around the visitor, arcade style: a qualifying score
 * gets an empty row at its place, a saved one is found by name and score.
 * Without either, the top rows show.
 */
export function boardWindow(
  top: readonly Entry[],
  size: number,
  you: { pending: number } | { saved: Entry } | null,
): Row[] {
  let rows: Row[] = top.map((entry, index) => ({ rank: index + 1, entry, you: false }));
  let at = -1;
  if (you && "pending" in you) {
    at = top.findIndex((entry) => you.pending > entry.score);
    if (at < 0) at = top.length;
    rows.splice(at, 0, { rank: at + 1, entry: null, you: true });
    rows = rows.map((row, index) => ({ ...row, rank: index + 1 }));
  } else if (you && "saved" in you) {
    at = top.findIndex(
      (entry) =>
        entry.name.toUpperCase() === you.saved.name.toUpperCase() &&
        entry.score === you.saved.score,
    );
    if (at >= 0) rows[at] = { ...rows[at]!, you: true };
  }
  // The board holds ten; a new entry pushes the old tenth off.
  rows = rows.slice(0, 10);
  const from = Math.max(0, Math.min(at - 1, rows.length - size));
  return rows.slice(from, from + size);
}

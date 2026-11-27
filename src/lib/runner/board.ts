export interface Entry {
  name: string;
  score: number;
}

/** Where a run stands on the whole board: rank, and the entry just above. */
export interface Place {
  rank: number;
  above: Entry | null;
}

export type Row =
  | {
      /** null while the rank is still loading. */
      rank: number | null;
      /** null is the visitor's own row. */
      entry: Entry | null;
      you: boolean;
    }
  | { gap: true };

/** Ranks past what the board keeps show as "1000+". */
export const BOARD_KEEP = 1000;

/**
 * The rows to show around a run, arcade style, `head + 2` rows at most:
 * near the top the board reads straight down with you in it; further down it
 * shows the top `head`, a gap, the one above you and you. A tie takes the
 * tied score's rank, as the server counts it, and lists you first.
 */
export function boardRows(
  top: readonly Entry[],
  head: number,
  you: { points: number; saved?: string } | null,
  place: Place | null,
): Row[] {
  const budget = head + 2;
  const list = top.map((entry, index) => ({ rank: index + 1, entry, you: false }));
  if (!you) return list.slice(0, budget);

  // Your rank: from the top rows when you land among them, else the server's.
  const beaten = top.filter((entry) => entry.score > you.points).length;
  const rank =
    beaten < top.length ? beaten + 1 : (place?.rank ?? (top.length < 10 ? top.length + 1 : null));

  if (rank !== null && rank <= budget) {
    const others: (Entry | null)[] = list.map((row) => row.entry);
    // A saved run is already on the board: drop its copy, it shows as you.
    if (you.saved !== undefined) {
      const name = you.saved.toUpperCase();
      const at = others.findIndex(
        (entry) => entry?.score === you.points && entry.name.toUpperCase() === name,
      );
      if (at >= 0) others.splice(at, 1);
    }
    others.splice(rank - 1, 0, null);
    return others.slice(0, budget).map((entry, index) => ({
      rank: index + 1,
      entry,
      you: entry === null,
    }));
  }

  const above =
    rank !== null && rank - 2 < top.length ? (top[rank - 2] ?? null) : (place?.above ?? null);
  return [
    ...list.slice(0, head),
    { gap: true },
    { rank: rank === null ? null : rank - 1, entry: above, you: false },
    { rank, entry: null, you: true },
  ];
}

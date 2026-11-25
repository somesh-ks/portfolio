import { describe, expect, test } from "bun:test";
import { boardWindow } from "@/lib/runner/board";

const top = [
  { name: "NATI", score: 120 },
  { name: "MAYA", score: 61 },
  { name: "OSKAR", score: 47 },
  { name: "ELIN", score: 12 },
  { name: "SAM", score: 5 },
];
const ranks = (rows: ReturnType<typeof boardWindow>) =>
  rows.map((row) => `${row.rank}${row.you ? "*" : ""}`).join(" ");

describe("leaderboard window", () => {
  test("a qualifying score gets an empty row at its place, with a neighbour each side", () => {
    const rows = boardWindow(top, 3, { pending: 34 });
    expect(ranks(rows)).toBe("3 4* 5");
    expect(rows[1]!.entry).toBeNull();
    expect(rows[2]!.entry?.name).toBe("ELIN");
  });

  test("a new best opens the board, a last place closes it", () => {
    expect(ranks(boardWindow(top, 3, { pending: 500 }))).toBe("1* 2 3");
    expect(ranks(boardWindow(top, 3, { pending: 1 }))).toBe("4 5 6*");
    expect(ranks(boardWindow([], 3, { pending: 9 }))).toBe("1*");
  });

  test("a new entry pushes the old tenth off a full board", () => {
    const full = Array.from({ length: 10 }, (_, index) => ({ name: "A", score: 100 - index }));
    expect(ranks(boardWindow(full, 3, { pending: 92 }))).toBe("8 9 10*");
  });

  test("a tie ranks below the score it ties", () => {
    expect(ranks(boardWindow(top, 3, { pending: 47 }))).toBe("3 4* 5");
  });

  test("a saved score is found by name and score; otherwise the top shows", () => {
    expect(ranks(boardWindow(top, 3, { saved: { name: "ELIN", score: 12 } }))).toBe("3 4* 5");
    expect(ranks(boardWindow(top, 3, { saved: { name: "ZED", score: 12 } }))).toBe("1 2 3");
    expect(ranks(boardWindow(top, 3, null))).toBe("1 2 3");
  });
});

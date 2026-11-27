import { describe, expect, test } from "bun:test";
import { boardRows, type Row } from "@/lib/runner/board";

const top = Array.from({ length: 10 }, (_, index) => ({
  name: `P${index + 1}`,
  score: 1000 - index * 100,
}));
const show = (rows: Row[]) =>
  rows.map((row) => ("gap" in row ? "…" : `${row.rank ?? "?"}${row.you ? "*" : ""}`)).join(" ");

describe("leaderboard rows", () => {
  test("near the top, the board reads straight down with you in it", () => {
    expect(show(boardRows(top, 4, { points: 2000 }, null))).toBe("1* 2 3 4 5 6");
    expect(show(boardRows(top, 4, { points: 750 }, null))).toBe("1 2 3 4* 5 6");
    const rows = boardRows(top, 4, { points: 750 }, null);
    expect("gap" in rows[4]! ? null : rows[4]!.entry?.name).toBe("P4");
  });

  test("further down: the top rows, a gap, the one above you, you", () => {
    expect(show(boardRows(top, 4, { points: 150 }, null))).toBe("1 2 3 4 … 9 10*");
    expect(show(boardRows(top, 3, { points: 450 }, null))).toBe("1 2 3 … 6 7*");
  });

  test("off the top ten, the server's place fills the rank and the row above", () => {
    const place = { rank: 400, above: { name: "MIKA", score: 41 } };
    const rows = boardRows(top, 4, { points: 40 }, place);
    expect(show(rows)).toBe("1 2 3 4 … 399 400*");
    expect("gap" in rows[5]! ? null : rows[5]!.entry?.name).toBe("MIKA");
    expect(show(boardRows(top, 4, { points: 40 }, null))).toBe("1 2 3 4 … ? ?*");
  });

  test("a tie takes the tied rank, as the server counts it", () => {
    expect(show(boardRows(top, 4, { points: 800 }, null))).toBe("1 2 3* 4 5 6");
  });

  test("a saved run shows once, as you", () => {
    const saved = [...top.slice(0, 2), { name: "Sam", score: 800 }, ...top.slice(2, 9)];
    const rows = boardRows(saved, 4, { points: 800, saved: "SAM" }, null);
    expect(show(rows)).toBe("1 2 3* 4 5 6");
    expect(rows.filter((row) => !("gap" in row) && row.entry?.name === "Sam")).toHaveLength(0);
  });

  test("a short board and no run", () => {
    expect(show(boardRows([], 4, { points: 9 }, null))).toBe("1*");
    expect(show(boardRows(top.slice(0, 2), 4, { points: 9 }, null))).toBe("1 2 3*");
    expect(show(boardRows(top, 4, null, null))).toBe("1 2 3 4 5 6");
  });
});

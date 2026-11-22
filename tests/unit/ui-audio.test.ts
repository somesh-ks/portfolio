import { expect, test } from "bun:test";
import { play, playedSince } from "../../src/lib/ui-audio";

// No window here, so play() only does its bookkeeping: that is the part a
// click handler relies on to skip its own tap.
test("a sound marks the click it played in", () => {
  const before = performance.now();
  expect(playedSince(before)).toBe(false);
  play("tap");
  expect(playedSince(before)).toBe(true);
  expect(playedSince(performance.now() + 1)).toBe(false);
});

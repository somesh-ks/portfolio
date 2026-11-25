import { describe, expect, test } from "bun:test";
import { beatUrl, parseBeat, shareText } from "../../src/lib/runner/share";

describe("runner share", () => {
  test("parseBeat takes plausible scores only", () => {
    expect(parseBeat("?beat=36")).toBe(36);
    expect(parseBeat("?beat=99999")).toBe(99999);
    for (const bad of [
      "",
      "?beat=",
      "?beat=0",
      "?beat=-3",
      "?beat=1e3",
      "?beat=100000",
      "?beat=12abc",
      "?beat=3.5",
    ])
      expect(parseBeat(bad)).toBeNull();
  });
  test("beatUrl keeps the page and drops other params and the hash", () => {
    expect(beatUrl("https://someshks.com/?beat=10&x=1#top", 52)).toBe(
      "https://someshks.com/?beat=52",
    );
    expect(beatUrl("https://someshks.com/experiments/claude-runner", 7)).toBe(
      "https://someshks.com/experiments/claude-runner?beat=7",
    );
  });
  test("shareText gloats only when it beat the shared score", () => {
    expect(shareText(52, 36)).toBe("I beat 00036 with 00052 on Claude Runner. Your turn:");
    expect(shareText(20, 36)).toBe("I scored 00020 on Claude Runner. Your turn:");
    expect(shareText(20, null)).toBe("I scored 00020 on Claude Runner. Your turn:");
  });
});

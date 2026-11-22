import { describe, expect, test } from "bun:test";
import { parseRange } from "@/lib/byte-range";

describe("parseRange", () => {
  test("no header means the full body", () => {
    expect(parseRange(null, 100)).toBeNull();
  });
  test("open-ended range is capped to the chunk size", () => {
    expect(parseRange("bytes=0-", 100, 10)).toEqual({ start: 0, end: 9 });
  });
  test("explicit range is clamped to the file", () => {
    expect(parseRange("bytes=90-200", 100, 50)).toEqual({ start: 90, end: 99 });
  });
  test("suffix range returns the tail", () => {
    expect(parseRange("bytes=-20", 100, 50)).toEqual({ start: 80, end: 99 });
  });
  test("a start past the end is unsatisfiable", () => {
    expect(parseRange("bytes=100-", 100)).toBe("unsatisfiable");
  });
  test("malformed or multi-range headers fall back to the full body", () => {
    expect(parseRange("bytes=0-1,5-9", 100)).toBeNull();
    expect(parseRange("items=0-1", 100)).toBeNull();
  });
});

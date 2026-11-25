import { describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "@/lib/spring/cli";
import type { View } from "@/lib/spring/tokens";

/** `spring scan <dir> --json --out file`: stdout and the written file, both parsed. */
function scan(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), "spring-cli-"));
  for (const [p, t] of Object.entries(files)) writeFileSync(join(dir, p), t);
  const out = join(dir, "view.out");
  let printed = "";
  const spy = spyOn(process.stdout, "write").mockImplementation((s) => {
    printed += String(s);
    return true;
  });
  try {
    main(["scan", dir, "--json", "--out", out]);
  } finally {
    spy.mockRestore();
  }
  const file = JSON.parse(readFileSync(out, "utf8")) as View;
  expect(JSON.parse(printed)).toEqual(file);
  return file.usage!;
}

describe("spring scan", () => {
  test("--json --out prints the view and writes it", () => {
    expect(scan({ "tokens.css": ":root { --bg: #fff; }" }).files).toBeGreaterThan(0);
  });

  test("a palette class is on-system only when its exact step is defined", () => {
    const u = scan({
      "tokens.css": ":root { --color-blue-500: #3b82f6; }",
      "a.tsx": 'export const A = () => <p className="bg-blue-500 bg-blue-600" />;',
    });
    expect(u.offSystem.map((h) => h.value)).toEqual(["bg-blue-600"]);
  });

  test("alias chains of any length count as used, and cycles end", () => {
    const u = scan({
      "tokens.css":
        ":root { --a: #000; --b: var(--a); --c: var(--b); --d: var(--c); --e: var(--d); --x: var(--y); --y: var(--x); }",
      "a.css": ".card { color: var(--e); background: var(--x); }",
    });
    for (const n of ["a", "b", "c", "d", "e", "x", "y"]) expect(u.refs[n]).toBeGreaterThan(0);
  });
});

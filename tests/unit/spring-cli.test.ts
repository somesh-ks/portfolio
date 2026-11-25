import { describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contrastPairs, main } from "@/lib/spring/cli";
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

const view = (bg: string): View => ({
  v: 1,
  sources: [],
  modes: ["light"],
  tokens: {
    background: { light: bg },
    primary: { light: "rgb(0 0 255 / 50%)" },
    "primary-foreground": { light: "#ffffff" },
    card: { light: "#ffffff" },
    "card-foreground": { light: "#000000" },
  },
});
const ratio = (v: View, bg: string) => contrastPairs(v).find((p) => p.bg === bg)?.ratio;

describe("contrastPairs", () => {
  test("a translucent pair over a page we can't read goes unmeasured", () => {
    const v = view("color(display-p3 1 1 1)");
    expect(ratio(v, "primary")).toBeNull();
    expect(ratio(v, "card")).toBe(21);
  });
  test("a readable page still measures translucent pairs", () => {
    expect(ratio(view("#ffffff"), "primary")).toBeGreaterThan(1);
  });
});

function run(argv: string[], files: Record<string, string>, open = () => {}) {
  const dir = mkdtempSync(join(tmpdir(), "spring-cli-"));
  for (const [p, t] of Object.entries(files)) writeFileSync(join(dir, p), t);
  let printed = "";
  const spy = spyOn(process.stdout, "write").mockImplementation((s) => {
    printed += String(s);
    return true;
  });
  const opened: string[] = [];
  try {
    main(["scan", dir, ...argv], { open: (u) => (opened.push(u), open()) });
  } finally {
    spy.mockRestore();
  }
  return { printed, opened };
}
describe("spring scan findings and --open", () => {
  const css = readFileSync(join(import.meta.dir, "../fixtures/tokens/shadcn-v4.css"), "utf8");

  test("prints findings counts, never a grade", () => {
    const { printed } = run([], { "tokens.css": css });
    expect(printed).toMatch(/^Findings: \d+ to look at$/m);
    expect(printed).toMatch(/^ {2}✓ \d+ checks? pass(es)?$/m);
    expect(printed).not.toMatch(/grade|score/i);
  });

  test("--json includes every finding with its status", () => {
    const { printed } = run(["--json"], { "tokens.css": css });
    const json = JSON.parse(printed) as { findings: { status: string; title: string }[] };
    expect(json.findings.length).toBeGreaterThan(0);
    expect(json.findings.every((f) => ["pass", "warn", "fail"].includes(f.status))).toBe(true);
  });

  test("--open hands the View link to the opener; without it nothing opens", () => {
    expect(run([], { "tokens.css": css }).opened).toEqual([]);
    const { opened } = run(["--open"], { "tokens.css": css });
    expect(opened).toHaveLength(1);
    expect(opened[0]).toStartWith("https://someshks.com/spring/view");
  });

  test("--open with --json opens the bare View URL; a failing opener never breaks the JSON", () => {
    const { opened, printed } = run(["--json", "--open"], { "tokens.css": css }, () => {
      throw new Error("no browser");
    });
    expect(opened).toEqual(["https://someshks.com/spring/view"]);
    expect(() => JSON.parse(printed)).not.toThrow();
  });
});

describe("scan-only build (design-sys skill)", () => {
  test("scan prints no audit findings", () => {
    process.env.SPRING_SCAN_ONLY = "1";
    const dir = mkdtempSync(join(tmpdir(), "spring-cli-"));
    writeFileSync(join(dir, "tokens.css"), ":root { --bg: #fff; --text: #999; }");
    let printed = "";
    const out = spyOn(process.stdout, "write").mockImplementation((s) => {
      printed += String(s);
      return true;
    });
    try {
      main(["scan", dir]);
      main(["scan", dir, "--json"]);
    } finally {
      out.mockRestore();
      delete process.env.SPRING_SCAN_ONLY;
    }
    expect(printed).toContain("Spring scan of");
    expect(printed).not.toContain("Findings");
    expect(printed).not.toContain('"findings"');
  });

  test("refuses build and prints only the scan commands", () => {
    process.env.SPRING_SCAN_ONLY = "1";
    let printed = "";
    const out = spyOn(process.stdout, "write").mockImplementation((s) => {
      printed += String(s);
      return true;
    });
    const exit = spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as never);
    try {
      expect(() => main(["build", "--primary", "#e11d48"])).toThrow("exit");
      expect(printed).toContain("spring scan");
      expect(printed).not.toContain("spring build");
    } finally {
      out.mockRestore();
      exit.mockRestore();
      delete process.env.SPRING_SCAN_ONLY;
    }
  });
});

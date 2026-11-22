import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// Prevents: an agent reading docs/ui-kit.md and missing a component that exists,
// or importing one the page names but the repo no longer has.
const ROOT = process.cwd();
const KIT_DIRS = ["src/components/ui", "src/components/code", "src/components/editorial"];
const doc = readFileSync(path.join(ROOT, "docs/ui-kit.md"), "utf8");
const css = ["globals.css", "components.css"]
  .map((file) => readFileSync(path.join(ROOT, "src/styles", file), "utf8"))
  .join("\n");

const section = (heading: string) => doc.split(`## ${heading}`)[1]?.split("\n## ")[0] ?? "";
const cells = (line: string) =>
  line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
const rows = (heading: string) =>
  section(heading)
    .split("\n")
    .filter((line) => line.startsWith("| `"))
    .map(cells);

const components = rows("Components");
const named = new Set(components.map(([name]) => name?.replaceAll("`", "")));

describe("docs/ui-kit.md", () => {
  test("every component in the kit folders has a row", () => {
    const missing = KIT_DIRS.flatMap((dir) =>
      readdirSync(path.join(ROOT, dir))
        .filter((file) => file.endsWith(".tsx"))
        .map((file) => file.replace(/\.tsx$/, ""))
        .filter((name) => !named.has(name))
        .map((name) => `${dir}/${name}.tsx`),
    );
    expect(missing).toEqual([]);
  });

  test("every row names a file that exports it, and says what it is not for", () => {
    const broken = components.flatMap(([name = "", file = "", , , not = ""]) => {
      const component = name.replaceAll("`", "");
      const source = path.join(ROOT, file.replaceAll("`", ""));
      if (!existsSync(source)) return [`${component}: no file ${file}`];
      if (!new RegExp(`export function ${component}\\b`).test(readFileSync(source, "utf8")))
        return [`${component}: not exported from ${file}`];
      return not ? [] : [`${component}: empty "Not for"`];
    });
    expect(broken).toEqual([]);
  });

  test("every shared class exists in the stylesheets", () => {
    const missing = rows("Shared classes")
      .map(([name = ""]) => name.replaceAll("`", ""))
      .filter((name) => !new RegExp(`\\.${name}(?![\\w-])`).test(css));
    expect(missing).toEqual([]);
  });
});

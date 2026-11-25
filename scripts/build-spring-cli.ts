/**
 * Bundle Spring's scan into one dependency-free Node script for the `design-sys`
 * agent skill. Usage: bun scripts/build-spring-cli.ts [out.mjs] [--full]
 * (default dist/scan.mjs). Copy the result into somesh-ks/skills at
 * skills/design-sys/scripts/scan.mjs; the header names the commit it came from.
 * Without --full, the script only answers `scan` and `schema view`: building
 * systems is the Spring app's job. (The build code is still in the file; the
 * bundler doesn't drop it.)
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const full = process.argv.includes("--full");
const out = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "dist/scan.mjs";
const entry = "dist/spring-entry.ts";
mkdirSync(dirname(out), { recursive: true });
mkdirSync("dist", { recursive: true });
writeFileSync(entry, `import { main } from "../src/lib/spring/cli";\nmain();\n`);
const result = await Bun.build({
  entrypoints: [entry],
  target: "node",
  format: "esm",
  minify: false,
  define: { "process.env.SPRING_SCAN_ONLY": full ? '"0"' : '"1"' },
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
let sha = "unknown";
try {
  sha = execSync("git rev-parse --short HEAD").toString().trim();
} catch {}
const code = await result.outputs[0]!.text();
const header = `#!/usr/bin/env node
// Spring ${full ? "CLI" : "scan"}, generated from github.com/somesh-ks/portfolio@${sha} (src/lib/spring).
// Don't edit: rebuild with \`bun scripts/build-spring-cli.ts\`. No dependencies; reads files only.
`;
writeFileSync(out, header + code.replace(/^#!.*\n/, ""));
console.warn(`${out}: ${Math.round(readFileSync(out).length / 1024)} KB`);

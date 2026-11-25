/**
 * Bundle Spring's engine and CLI into one dependency-free Node script for the
 * `spring` agent skill. Usage: bun scripts/build-spring-cli.ts [out.mjs]
 * (default dist/spring.mjs). Copy the result into somesh-ks/skills at
 * skills/spring/scripts/spring.mjs; the header names the commit it came from.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const out = process.argv[2] ?? "dist/spring.mjs";
const entry = "dist/spring-entry.ts";
mkdirSync(dirname(out), { recursive: true });
mkdirSync("dist", { recursive: true });
writeFileSync(entry, `import { main } from "../src/lib/spring/cli";\nmain();\n`);
const result = await Bun.build({
  entrypoints: [entry],
  target: "node",
  format: "esm",
  minify: false,
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
// Spring CLI, generated from github.com/somesh-ks/portfolio@${sha} (src/lib/spring).
// Don't edit: rebuild with \`bun scripts/build-spring-cli.ts\`. No dependencies; reads files only.
`;
writeFileSync(out, header + code.replace(/^#!.*\n/, ""));
console.warn(`${out}: ${Math.round(readFileSync(out).length / 1024)} KB`);

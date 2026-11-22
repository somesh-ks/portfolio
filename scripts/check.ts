/** One gate for local and CI: types, lint, format, tokens, dead code. */
import { spawnSync } from "node:child_process";

const STEPS = ["typecheck", "lint", "format:check", "tokens:check", "knip"];
const failed: string[] = [];
for (const step of STEPS) {
  console.warn(`\n▸ ${step}`);
  const result = spawnSync("bun", ["run", step], { stdio: "inherit" });
  if (result.status !== 0) failed.push(step);
}
if (failed.length) {
  console.error(`\ncheck failed: ${failed.join(", ")}`);
  process.exit(1);
}
console.warn("\ncheck passed");

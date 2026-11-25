/**
 * After `bun run build`: keep client JS inside budget and prove no protected
 * content reached the static output (client chunks or prerendered HTML).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { NDA_SENTINELS } from "../tests/fixtures/sentinels.ts";

const BUDGET_KB = 500; // gzipped client JS across every chunk, a regression alarm. Spring (/spring) is ~45 KB of it, loaded only on that page.
const ROOTS = [".next/static", ".next/server/app"];
// Next's legacy polyfills load only in browsers without ES modules (<script
// noModule>), so no current browser downloads them; they don't count.
const LEGACY = new Set(
  (JSON.parse(readFileSync(".next/build-manifest.json", "utf8")).polyfillFiles as string[]).map(
    (file) => join(".next", file),
  ),
);

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

let jsBytes = 0;
const leaks: string[] = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (!/\.(js|html|rsc|txt|md|json|body)$/.test(file)) continue;
    const content = readFileSync(file);
    if (root === ".next/static" && file.endsWith(".js") && !LEGACY.has(file))
      jsBytes += gzipSync(content).length;
    const text = content.toString("utf8");
    for (const sentinel of NDA_SENTINELS) if (text.includes(sentinel)) leaks.push(file);
  }
}

const kb = Math.round(jsBytes / 1024);
console.warn(`client JS: ${kb} KB gzipped (budget ${BUDGET_KB} KB)`);
if (leaks.length) console.error(`NDA sentinel found in:\n  ${leaks.join("\n  ")}`);
if (kb > BUDGET_KB) console.error("client JS over budget");
if (leaks.length || kb > BUDGET_KB) process.exit(1);
console.warn("no protected content in the build output");

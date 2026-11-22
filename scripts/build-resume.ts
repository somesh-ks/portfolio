/**
 * Compiles resume/resume.tex to public/resume.pdf, but only when the LaTeX
 * changed. The source hash lives in resume/.hash, so the committed PDF is
 * served straight from the CDN and nothing rebuilds on deploy.
 *
 *   bun run resume          rebuild if the source changed (needs tectonic)
 *   bun run resume --check  fail if the PDF is stale (no TeX needed; runs in check)
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";

const SOURCES = ["resume/resume.tex", "resume/resume.cls"];
const PDF = "public/resume.pdf";
const STAMP = "resume/.hash";

const hash = createHash("sha256");
for (const file of SOURCES) hash.update(readFileSync(file));
const current = hash.digest("hex");
const stamped = existsSync(STAMP) ? readFileSync(STAMP, "utf8").trim() : "";
const fresh = stamped === current && existsSync(PDF);

if (process.argv.includes("--check")) {
  if (!fresh) {
    console.error("public/resume.pdf is stale. Run `bun run resume` and commit the PDF.");
    process.exit(1);
  }
  process.exit(0);
}

if (fresh) {
  console.warn("resume unchanged, skipping");
  process.exit(0);
}

const result = spawnSync("tectonic", ["--outdir", "resume", "resume/resume.tex"], {
  stdio: "inherit",
});
if (result.error || result.status !== 0) {
  console.error("tectonic failed. Install it: https://tectonic-typesetting.github.io");
  process.exit(1);
}
renameSync("resume/resume.pdf", PDF);
writeFileSync(STAMP, `${current}\n`);
console.warn(`wrote ${PDF}`);

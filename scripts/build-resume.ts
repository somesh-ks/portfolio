/**
 * Builds public/resume.pdf from resume/resume.tex before `next build`.
 *
 * The PDF is cached in .next/cache (Vercel keeps it between deploys) under the
 * source hash, so a deploy that leaves the LaTeX alone just copies it. Only a
 * changed source compiles, with Tectonic fetched on demand. The PDF never
 * enters git; visitors download it as a static file from the CDN.
 *
 * Outside Vercel the step is skipped unless `tectonic` is on PATH.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SOURCES = ["resume/resume.tex", "resume/resume.cls"];
const OUT = "public/resume.pdf";
const CACHE = ".next/cache/resume";
const LAST = join(CACHE, "last.pdf");
const TECTONIC_VERSION = "0.15.0";
const TECTONIC_URL = `https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-x86_64-unknown-linux-musl.tar.gz`;

const hash = createHash("sha256");
for (const file of SOURCES) hash.update(await Bun.file(file).bytes());
const cached = join(CACHE, `${hash.digest("hex").slice(0, 16)}.pdf`);
mkdirSync(CACHE, { recursive: true });

if (existsSync(cached)) {
  copyFileSync(cached, OUT);
  console.warn("resume unchanged, using cached PDF");
  process.exit(0);
}

const tectonic = await findTectonic();
if (!tectonic) {
  if (existsSync(LAST)) copyFileSync(LAST, OUT);
  console.warn("resume: tectonic unavailable, using the last PDF if there is one");
  process.exit(0);
}

const run = spawnSync(tectonic, ["--outdir", CACHE, "resume/resume.tex"], { stdio: "inherit" });
if (run.status === 0) {
  copyFileSync(join(CACHE, "resume.pdf"), cached);
  copyFileSync(cached, LAST);
  copyFileSync(cached, OUT);
  console.warn("resume compiled");
} else if (existsSync(LAST)) {
  copyFileSync(LAST, OUT);
  console.warn("resume: compile failed, serving the last good PDF");
} else {
  console.error("resume: compile failed and no earlier PDF exists");
  process.exit(1);
}

async function findTectonic(): Promise<string | undefined> {
  if (spawnSync("tectonic", ["--version"]).status === 0) return "tectonic";
  if (!process.env.VERCEL) return undefined;
  const bin = join(CACHE, `tectonic-${TECTONIC_VERSION}`);
  if (existsSync(bin)) return bin;
  const response = await fetch(TECTONIC_URL);
  if (!response.ok) return undefined;
  const archive = join(CACHE, "tectonic.tar.gz");
  writeFileSync(archive, new Uint8Array(await response.arrayBuffer()));
  if (spawnSync("tar", ["-xzf", archive, "-C", CACHE]).status !== 0) return undefined;
  copyFileSync(join(CACHE, "tectonic"), bin);
  spawnSync("chmod", ["+x", bin]);
  return bin;
}

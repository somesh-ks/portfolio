/**
 * Export the comic shelf reader's curated pages from the local course folder.
 *   COMICS_SOURCE="<ENFW14 folder>" bun run comics:pages
 * Reads the picks in src/components/case-studies/comic-shelf-pages.ts, resizes each page,
 * and writes WebP under public/case-studies/graphic-comic-making-from-novels/books/<id>/NN.webp,
 * stepping quality down until each file fits MAX_BYTES.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { COMIC_BOOK_PAGES, comicPageSrc } from "../src/components/case-studies/comic-shelf-pages";

const DEFAULT_SOURCE =
  "C:/Users/soke/Desktop/Independent Courses/ENFW14 - Famous works of English Literature";
const source = process.env.COMICS_SOURCE ?? DEFAULT_SOURCE;
const MAX_BYTES = 300 * 1024;

if (!existsSync(source)) {
  console.error(`Source folder not found: ${source}. Set COMICS_SOURCE.`);
  process.exit(1);
}

let total = 0;
for (const book of COMIC_BOOK_PAGES) {
  for (const [index, pick] of book.picks.entries()) {
    const input = join(source, book.dir, pick.file);
    if (!existsSync(input)) throw new Error(`Missing page: ${input}`);
    let quality = 80;
    let data = Buffer.alloc(0);
    for (; quality >= 40; quality -= 5) {
      data = await sharp(input)
        .resize({ width: book.width, height: book.height, fit: "cover" })
        .webp({ quality, effort: 6 })
        .toBuffer();
      if (data.byteLength <= MAX_BYTES) break;
    }
    if (data.byteLength > MAX_BYTES) throw new Error(`${input} does not fit ${MAX_BYTES} bytes`);
    const out = join("public", comicPageSrc(book.id, index));
    mkdirSync(join(out, ".."), { recursive: true });
    writeFileSync(out, data);
    total += data.byteLength;
    console.warn(`${out}  ${(data.byteLength / 1024).toFixed(0)} KB  q${quality}`);
  }
}
console.warn(`${(total / 1024 / 1024).toFixed(1)} MB across ${COMIC_BOOK_PAGES.length} books`);

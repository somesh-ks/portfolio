/**
 * Snapshot of the Google Fonts catalogue for Spring's font browser:
 * [family, category, static weights, [wght min, max] or 0, italic 0|1],
 * Latin families only, most popular first. Served as a static file and
 * fetched only when the browser opens, so it never enters the bundle.
 *
 *   bun scripts/google-fonts.ts
 */
import { write } from "bun";

const res = await fetch("https://fonts.google.com/metadata/fonts");
const text = await res.text();
const data = JSON.parse(text.slice(text.indexOf("{"))) as {
  familyMetadataList: {
    family: string;
    category: string;
    subsets: string[];
    popularity: number;
    fonts: Record<string, unknown>;
    axes: { tag: string; min: number; max: number }[];
  }[];
};
const CAT: Record<string, string> = {
  "Sans Serif": "s",
  Serif: "r",
  Display: "d",
  Monospace: "m",
  Handwriting: "h",
};
const SAFE = /^[A-Za-z0-9][A-Za-z0-9 ]{0,59}$/;
const out = data.familyMetadataList
  .filter((f) => f.subsets.includes("latin") && SAFE.test(f.family) && CAT[f.category])
  .toSorted((a, b) => a.popularity - b.popularity)
  .map((f) => {
    const keys = Object.keys(f.fonts);
    const weights = [...new Set(keys.map((k) => Number.parseInt(k, 10)))]
      .filter(Number.isFinite)
      .toSorted((a, b) => a - b);
    const w = f.axes.find((a) => a.tag === "wght");
    return [
      f.family,
      CAT[f.category],
      weights,
      w ? [Math.round(w.min), Math.round(w.max)] : 0,
      keys.some((k) => k.endsWith("i")) ? 1 : 0,
    ];
  });
await write("public/spring/google-fonts.json", JSON.stringify(out));
console.warn(`${out.length} families`);

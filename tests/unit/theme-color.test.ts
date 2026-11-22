/** The theme-color meta needs hex literals; keep them equal to surface.canvas. */
import { expect, test } from "bun:test";
import primitives from "../../tokens/primitives.json";
import { THEME_COLOR } from "@/lib/site";

// Neutral greys only (chroma 0): OKLCH lightness cubed is linear sRGB.
const hex = (step: "25" | "975") => {
  const [l] = primitives.color.gray[step].$value.components as number[];
  const y = (l ?? 0) ** 3;
  const s = y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055;
  return `#${Math.round(s * 255)
    .toString(16)
    .padStart(2, "0")
    .repeat(3)}`;
};

test("theme-color hex matches the canvas tokens", () => {
  expect(hex("25")).toBe(THEME_COLOR.light);
  expect(hex("975")).toBe(THEME_COLOR.dark);
});

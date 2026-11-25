import { ogCard, OG_SIZE } from "@/lib/og";

export const alt = "Spring, a design system tool by Somesh Kesarla Suresh";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    title: "Spring",
    summary: "Make the color and type foundations of a design system, and export them as tokens.",
    path: "/spring/app",
  });
}

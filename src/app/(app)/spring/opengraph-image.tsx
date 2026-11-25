import { ogCard, OG_SIZE } from "@/lib/og";

export const alt = "Spring, a design system tool by Somesh Kesarla Suresh";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    title: "Spring",
    summary: "Tools to shape design system foundation: color, type, space, motion and tokens.",
    path: "/spring",
  });
}

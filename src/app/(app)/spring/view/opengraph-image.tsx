import { ogCard, OG_SIZE } from "@/lib/og";

export const alt = "Spring view, a design system tool by Somesh Kesarla Suresh";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    title: "Spring view",
    summary: "See any project's design system: colors, contrast, type and space.",
    path: "/spring/view",
    meta: "tool",
  });
}

import { PROFILE } from "@content/profile";
import { ogCard, OG_SIZE } from "@/lib/og";

export const alt = `${PROFILE.name}, design engineer in Stockholm`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    eyebrow: "Design engineer · Stockholm",
    title: PROFILE.name,
    summary: "Claude Ambassador, Sweden. Products from zero to one, designed and built.",
  });
}

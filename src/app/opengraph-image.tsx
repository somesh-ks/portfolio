import { PROFILE } from "@content/profile";
import { ogCard, OG_SIZE } from "@/lib/og";

export const alt = `${PROFILE.name}, design engineer in Stockholm`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    title: PROFILE.name,
    summary: "Design engineer in Stockholm. Claude Ambassador, Sweden.",
  });
}

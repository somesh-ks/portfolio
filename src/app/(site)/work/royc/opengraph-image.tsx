import { OG_SIZE } from "@/lib/og";
import { lockedOg } from "@/lib/og-route";

export const alt = "Somesh Kesarla Suresh, case study";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return lockedOg("royc");
}

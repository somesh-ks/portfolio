import { OG_SIZE } from "@/lib/og";
import { entryOgRoute } from "@/lib/og-route";

const route = entryOgRoute("case-study");

export const alt = "Somesh Kesarla Suresh";
export const size = OG_SIZE;
export const contentType = "image/png";
export const generateStaticParams = route.generateStaticParams;
export default route.Image;

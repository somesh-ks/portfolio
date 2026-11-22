import { publicEntryRoute } from "@/lib/entry-page";

const route = publicEntryRoute("case-study");

export const dynamicParams = false;
export const generateStaticParams = route.generateStaticParams;
export const generateMetadata = route.generateMetadata;
export default route.Page;

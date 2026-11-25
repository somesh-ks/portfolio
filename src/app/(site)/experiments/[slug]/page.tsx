import { publicEntryRoute } from "@/lib/entry-page";

const route = publicEntryRoute("experiment");

export const dynamicParams = false;
export const generateStaticParams = route.generateStaticParams;
export const generateMetadata = route.generateMetadata;
export default route.Page;

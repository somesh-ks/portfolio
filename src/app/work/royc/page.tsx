import { LockedCaseStudy, lockedMetadata } from "@/components/locked/LockedCaseStudy";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const generateMetadata = () => lockedMetadata("royc");

export default function Page({ searchParams }: Props) {
  return <LockedCaseStudy slug="royc" searchParams={searchParams} />;
}

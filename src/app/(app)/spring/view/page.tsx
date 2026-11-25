import type { Metadata } from "next";
import { OG_BASE } from "@/lib/site";
import { SpringView } from "@/components/experiments/spring/View";

const description = "See a project's design system: colors, contrast, type, space and more.";

export const metadata: Metadata = {
  title: { absolute: "Spring view" },
  description,
  alternates: { canonical: "/spring/view", types: { "text/markdown": "/spring/llms.txt" } },
  openGraph: { ...OG_BASE, url: "/spring/view", title: "Spring view", description },
  // The page is only useful with a visitor's files or link.
  robots: { index: false, follow: true },
};

export default function SpringViewPage() {
  return (
    <main id="main" tabIndex={-1}>
      <SpringView />
    </main>
  );
}

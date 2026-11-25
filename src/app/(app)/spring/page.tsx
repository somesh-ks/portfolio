import type { Metadata } from "next";
import { SpringApp } from "@/components/experiments/spring/Tools";

const description =
  "Tools to shape design system foundation: color, type, space, motion and tokens.";

export const metadata: Metadata = {
  title: { absolute: "Spring" },
  description,
  alternates: { canonical: "/spring", types: { "text/markdown": "/spring/llms.txt" } },
  openGraph: { url: "/spring", title: "Spring", description },
};

export default function SpringPage() {
  return (
    <main id="main" tabIndex={-1} className="spring-app">
      <SpringApp />
    </main>
  );
}

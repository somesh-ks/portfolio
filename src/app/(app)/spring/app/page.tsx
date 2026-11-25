import type { Metadata } from "next";
import { OG_BASE } from "@/lib/site";
import { SpringApp } from "@/components/experiments/spring/Tools";

const description =
  "Make the color and type foundations of a design system, and export them as tokens.";

export const metadata: Metadata = {
  title: { absolute: "Spring app" },
  description,
  alternates: { canonical: "/spring/app", types: { "text/markdown": "/spring/llms.txt" } },
  openGraph: { ...OG_BASE, url: "/spring/app", title: "Spring app", description },
};

export default function SpringPage() {
  return (
    <main id="main" tabIndex={-1} className="spring-app">
      <SpringApp />
    </main>
  );
}

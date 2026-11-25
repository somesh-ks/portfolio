import type { Metadata } from "next";
import { OG_BASE } from "@/lib/site";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Closing, OldAppLinks } from "@/components/experiments/spring/landing/Demos";
import { Features } from "@/components/experiments/spring/landing/Features";
import { LandingMotionProvider } from "@/components/experiments/spring/landing/Motion";
import { GITHUB, ScrollNav } from "@/components/experiments/spring/landing/Nav";
import { Hero } from "@/components/experiments/spring/landing/Hero";
import { landingData } from "@/components/experiments/spring/landing/data";
import "@/components/experiments/spring/landing/landing.css";

const description =
  "Color and type tokens from one brand color: scales, roles and type for light and dark, every text pair checked, exported to CSS, Tailwind and DTCG.";

export const metadata: Metadata = {
  title: { absolute: "Spring: color and type tokens" },
  description,
  alternates: { canonical: "/spring", types: { "text/markdown": "/spring/llms.txt" } },
  openGraph: { ...OG_BASE, url: "/spring", title: "Spring", description },
};

export default function SpringLanding() {
  const brands = landingData();
  return (
    <LandingMotionProvider>
      <div className="spring-landing">
        <OldAppLinks />
        <ScrollNav />
        <main id="main" tabIndex={-1} className="spring-landing__main">
          <Hero brands={brands} />
          <Features brands={brands} />
          <Closing brands={brands} />
        </main>
        <footer className="spring-foot">
          <p>
            <span className="spring-mark">spring</span> Free and open source. Your system lives in
            your browser and in the link you share.
          </p>
          <span className="spring-foot__links">
            <a href={GITHUB}>GitHub</a>
            {/* A text file, not a page. */}
            {/* oxlint-disable-next-line next/no-html-link-for-pages */}
            <a href="/spring/llms.txt">llms.txt</a>
            <ThemeToggle />
          </span>
        </footer>
      </div>
    </LandingMotionProvider>
  );
}

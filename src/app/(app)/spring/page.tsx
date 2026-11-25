import type { Metadata } from "next";
import Link from "next/link";
import { OG_BASE } from "@/lib/site";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Audit } from "@/components/experiments/spring/landing/Audit";
import { Closing, OldAppLinks } from "@/components/experiments/spring/landing/Demos";
import { LandingMotionProvider, PauseToggle } from "@/components/experiments/spring/landing/Motion";
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

const GITHUB = "https://github.com/somesh-ks/skills";

export default function SpringLanding() {
  const brands = landingData();
  return (
    <LandingMotionProvider>
      <div className="spring-landing">
        <OldAppLinks />
        <header className="spring-nav" data-theme="dark">
          <Link href="/spring" className="spring-nav__mark" aria-label="Spring home">
            spring
          </Link>
          <nav className="spring-nav__links" aria-label="Spring">
            <a href="#existing">Audit</a>
            <a href={GITHUB}>GitHub</a>
          </nav>
          <span className="spring-nav__end">
            <PauseToggle />
            <Link href="/spring/app" className="spring-nav__cta pressable">
              Open Spring
            </Link>
          </span>
        </header>
        <main id="main" tabIndex={-1} className="spring-landing__main">
          <Hero brands={brands} />
          <Audit />
          <Closing brands={brands} />
        </main>
        <footer className="spring-foot">
          <p>
            <span className="spring-nav__mark">spring</span> Free and open source. Your system lives
            in your browser and in the link you share.
          </p>
          <span className="spring-foot__links">
            <Link href="/spring/view">View a scan</Link>
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

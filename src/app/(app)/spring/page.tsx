import type { Metadata } from "next";
import Link from "next/link";
import { OG_BASE } from "@/lib/site";
import { BackLink } from "@/components/editorial/BackLink";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  MakeTile,
  OldAppLinks,
  ScanTile,
  SeeTile,
  ShipTile,
} from "@/components/experiments/spring/landing/Demos";
import { LandingMotionProvider, PauseToggle } from "@/components/experiments/spring/landing/Motion";
import { Hero } from "@/components/experiments/spring/landing/Hero";
import { SoundToggle } from "@/components/ui/SoundToggle";
import "@/components/experiments/spring/landing/landing.css";

const description =
  "See the design system you have, with unused tokens and failing contrast. Make the one you want from one brand color.";

export const metadata: Metadata = {
  title: { absolute: "Spring" },
  description,
  alternates: { canonical: "/spring", types: { "text/markdown": "/spring/llms.txt" } },
  openGraph: { ...OG_BASE, url: "/spring", title: "Spring", description },
};

export default function SpringLanding() {
  return (
    <LandingMotionProvider>
      <div className="spring-landing">
        <OldAppLinks />
        <header className="spring-landing__bar" data-theme="dark">
          <BackLink />
          <span className="spring-landing__actions">
            <PauseToggle />
            <Link href="/spring/app" className="button pressable">
              Open app
            </Link>
            <SoundToggle />
            <ThemeToggle />
          </span>
        </header>
        <main id="main" tabIndex={-1} className="spring-landing__main">
          <Hero />
          <section className="spring-mode" aria-labelledby="spring-read">
            <header className="spring-mode__head">
              <h2 id="spring-read">Read what you have</h2>
              <p>Your agent scans the repo. You see it in View.</p>
            </header>
            <div className="spring-mode__row">
              <ScanTile />
              <SeeTile />
            </div>
          </section>
          <section className="spring-mode" aria-labelledby="spring-make">
            <header className="spring-mode__head">
              <h2 id="spring-make">Make the one you want</h2>
              <p>In the app, or your agent runs spring build.</p>
            </header>
            <div className="spring-mode__row">
              <MakeTile />
              <ShipTile />
            </div>
          </section>
          <footer className="spring-landing__end">
            <p>Free and open source. The skill runs offline.</p>
            <Link href="/spring/app" className="link">
              Open app
            </Link>
            <Link href="/spring/view" className="link">
              View a scan
            </Link>
            <a href="https://github.com/somesh-ks/skills" className="link">
              GitHub
            </a>
            {/* A text file, not a page. */}
            {/* oxlint-disable-next-line next/no-html-link-for-pages */}
            <a href="/spring/llms.txt" className="link">
              llms.txt
            </a>
          </footer>
        </main>
      </div>
    </LandingMotionProvider>
  );
}

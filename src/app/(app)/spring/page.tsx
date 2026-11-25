import type { Metadata } from "next";
import Link from "next/link";
import { OG_BASE } from "@/lib/site";
import { BackLink } from "@/components/editorial/BackLink";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MotionDemo, OldAppLinks, TypeDemo } from "@/components/experiments/spring/landing/Demos";
import { Hero } from "@/components/experiments/spring/landing/Hero";
import { SoundToggle } from "@/components/ui/SoundToggle";
import "@/components/experiments/spring/landing/landing.css";

const description = "A design system skill for your agent, and an app to shape one.";

export const metadata: Metadata = {
  title: { absolute: "Spring" },
  description,
  alternates: { canonical: "/spring", types: { "text/markdown": "/spring/llms.txt" } },
  openGraph: { ...OG_BASE, url: "/spring", title: "Spring", description },
};

export default function SpringLanding() {
  return (
    <div className="spring-landing">
      <OldAppLinks />
      <header className="spring-landing__bar" data-theme="dark">
        <BackLink />
        <span className="spring-landing__actions">
          <Link href="/spring/app" className="button pressable">
            Open app
          </Link>
          <SoundToggle />
          <ThemeToggle />
        </span>
      </header>
      <main id="main" tabIndex={-1} className="spring-landing__main">
        <Hero />
        <TypeDemo />
        <MotionDemo />
        <footer className="spring-landing__end">
          <Link href="/spring/app" className="button button--primary pressable">
            Open app
          </Link>
          <Link href="/spring/view" className="link">
            View a repo&apos;s tokens
          </Link>
          {/* A text file, not a page. */}
          {/* oxlint-disable-next-line next/no-html-link-for-pages */}
          <a href="/spring/llms.txt" className="link">
            llms.txt
          </a>
        </footer>
      </main>
    </div>
  );
}

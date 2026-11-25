import type { Metadata } from "next";
import Link from "next/link";
import { OG_BASE } from "@/lib/site";
import { Command } from "@/components/code/Command";
import { BackLink } from "@/components/editorial/BackLink";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  MotionDemo,
  OldAppLinks,
  PaletteDemo,
  TypeDemo,
} from "@/components/experiments/spring/landing/Demos";
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
      <header className="spring-landing__bar">
        <BackLink />
        <span className="spring-landing__actions">
          <Link href="/spring/app" className="button pressable">
            Open app
          </Link>
          <ThemeToggle />
        </span>
      </header>
      <main id="main" tabIndex={-1} className="spring-landing__main">
        <section className="spring-landing__hero">
          <h1 className="spring-landing__name">Spring</h1>
          <p className="spring-landing__lede">
            Your agent sees your design system, or builds a new one.
          </p>
          <Command command="npx skills add somesh-ks/skills --skill spring" />
          <p className="spring-landing__note">
            Works in Claude Code, Cursor, Codex and any agent that reads SKILL.md.
          </p>
        </section>
        <PaletteDemo />
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

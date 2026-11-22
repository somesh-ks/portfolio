"use client";

import {
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  CircleAlert,
  Home,
  Inbox,
  LayoutGrid,
  Search,
  Settings,
  Users,
} from "lucide-react";
import type { Mode } from "@/lib/spring/color";
import type { System } from "@/lib/spring/system";
import { Scope } from "./Scope";

const lineOf = (l: string) => l.trim() || "A short line about what it does and who it helps.";

/** The name as a wordmark, on the surfaces it will live on. */
export function Wordmark({ system, mode }: { system: System; mode: Mode }) {
  const name = system.input.name || "Untitled";
  return (
    <Scope system={system} mode={mode}>
      <div className="grid gap-3 p-4">
        <div className="sp-sub grid min-h-36 place-items-center rounded-[inherit] p-6">
          <div className="sp-display text-center">{name}</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="sp-tile sp-tile--accent sp-h3">{name}</div>
          <div className="sp-tile sp-tile--ink sp-h3">{name}</div>
          <div className="sp-tile sp-tile--subtle sp-h3">{name}</div>
        </div>
      </div>
    </Scope>
  );
}

/** Type set in the visitor's own words, with numbers and a label. */
export function Specimen({ system, mode, line }: { system: System; mode: Mode; line: string }) {
  const body = system.type.tokens.find((t) => t.role === "body");
  return (
    <Scope system={system} mode={mode}>
      <div className="grid gap-5 p-5">
        <div className="sp-display">{lineOf(line)}</div>
        <div className="sp-lead">
          Every screen, email and slide speaks in the same voice, so the product feels like one
          thing.
        </div>
        <div className="sp-rule grid gap-2 pt-4">
          <div className="sp-h2">Reading at length</div>
          <div>
            Body text carries most of the product. It is set at {body?.max}px with a line height on
            the grid, so paragraphs stay calm over a long read.
          </div>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <span className="sp-h1 sp-num">€48,210.50</span>
          <span className="sp-label">Revenue this month</span>
          <span className="sp-caption">+12.4% vs last month</span>
          <span className="sp-mono">npm i acme</span>
        </div>
      </div>
    </Scope>
  );
}

/** Buttons, fields, badges and an alert: judge the whole, not swatches. */
export function Components({ system, mode }: { system: System; mode: Mode }) {
  return (
    <Scope system={system} mode={mode}>
      <div className="grid gap-5 p-5">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="sp-btn sp-btn--primary" tabIndex={-1}>
            Get started <ArrowRight size={16} aria-hidden />
          </button>
          <button type="button" className="sp-btn sp-btn--secondary" tabIndex={-1}>
            Secondary
          </button>
          <button type="button" className="sp-btn sp-btn--ghost" tabIndex={-1}>
            Ghost
          </button>
          <button type="button" className="sp-btn sp-btn--danger" tabIndex={-1}>
            Delete
          </button>
        </div>
        <div className="grid gap-4 @md:grid-cols-2">
          <div className="grid gap-1.5">
            <span className="sp-label">Work email</span>
            <span className="sp-field sp-muted">you@company.com</span>
            <span className="sp-caption">We'll never share it.</span>
          </div>
          <div className="grid gap-1.5">
            <span className="sp-label">Plan</span>
            <span className="sp-field justify-between">
              Team <ChevronDown size={16} aria-hidden />
            </span>
            <span className="sp-caption sp-text-danger">Choose a plan to continue.</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="sp-badge sp-badge--accent">New</span>
          <span className="sp-badge sp-badge--success">Paid</span>
          <span className="sp-badge sp-badge--warning">Pending</span>
          <span className="sp-badge sp-badge--danger">Failed</span>
          <span className="sp-badge sp-badge--info">Beta</span>
        </div>
        <div className="sp-card sp-card--raised flex items-start gap-3 p-4">
          <CircleAlert size={18} className="sp-text-info mt-0.5 shrink-0" aria-hidden />
          <div className="grid gap-0.5">
            <span className="sp-label">Your trial ends in 3 days</span>
            <span className="sp-caption">Add a payment method to keep your projects.</span>
          </div>
          <button
            type="button"
            className="sp-btn sp-btn--secondary sp-btn--sm ml-auto"
            tabIndex={-1}
          >
            Upgrade
          </button>
        </div>
      </div>
    </Scope>
  );
}

/** A homepage hero: every brand ends up here first. */
export function Homepage({ system, mode, line }: { system: System; mode: Mode; line: string }) {
  return (
    <Scope system={system} mode={mode}>
      <nav
        className="sp-rule flex items-center justify-between px-5 py-3"
        style={{ borderTop: 0, borderBottom: "1px solid var(--color-border-subtle)" }}
      >
        <span className="sp-h3" style={{ fontSize: "var(--text-body-lg)" }}>
          {system.input.name || "Untitled"}
        </span>
        <span className="hidden gap-5 @md:flex">
          {["Product", "Pricing", "Customers"].map((x) => (
            <span key={x} className="sp-label sp-muted">
              {x}
            </span>
          ))}
        </span>
        <span className="sp-btn sp-btn--primary sp-btn--sm">Sign up</span>
      </nav>
      <section className="grid gap-5 px-5 py-14 text-center">
        <div className="sp-display mx-auto max-w-[18ch]">{lineOf(line)}</div>
        <div className="sp-lead mx-auto max-w-[44ch]">
          Start free, no card needed. Upgrade when your team grows.
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <span className="sp-btn sp-btn--primary sp-btn--lg">Start free</span>
          <span className="sp-btn sp-btn--secondary sp-btn--lg">Book a demo</span>
        </div>
      </section>
      <section className="grid gap-3 px-5 pb-8 @md:grid-cols-3">
        {[
          ["Starter", "0", false],
          ["Team", "24", true],
          ["Scale", "89", false],
        ].map(([name, price, pick]) => (
          <div
            key={name as string}
            className={`sp-card grid gap-2 p-4 ${pick ? "sp-card--raised" : ""}`}
          >
            <span className="sp-label">{name}</span>
            <span className="sp-h2 sp-num">
              €{price}
              <span className="sp-caption"> / month</span>
            </span>
            <span className="sp-label flex items-center gap-2" style={{ fontWeight: 400 }}>
              <Check size={14} className="sp-text-accent" aria-hidden /> Unlimited projects
            </span>
          </div>
        ))}
      </section>
    </Scope>
  );
}

const ROWS = [
  ["Acme Inc.", "Paid", "€1,240.00", "success"],
  ["Northwind", "Pending", "€860.00", "warning"],
  ["Globex", "Failed", "€310.50", "danger"],
  ["Initech", "Paid", "€2,015.00", "success"],
] as const;

/** A dense app screen, where most systems break. */
export function AppScreen({ system, mode }: { system: System; mode: Mode }) {
  return (
    <Scope system={system} mode={mode}>
      <div className="grid @md:grid-cols-[11rem_1fr]">
        <aside className="sp-side hidden content-start gap-1 p-3 @md:grid">
          {(
            [
              [Home, "Home"],
              [Inbox, "Inbox"],
              [Users, "Customers"],
              [LayoutGrid, "Reports"],
              [Settings, "Settings"],
            ] as const
          ).map(([Icon, label], i) => (
            <span
              key={label}
              className={`sp-label flex items-center gap-2 px-2 py-1.5 ${i ? "sp-muted" : "sp-nav-on"}`}
            >
              <Icon size={16} aria-hidden /> {label}
            </span>
          ))}
        </aside>
        <div className="grid content-start gap-4 p-4">
          <div className="flex items-center gap-2">
            <div className="sp-h3 mr-auto">Invoices</div>
            <span className="sp-field sp-muted hidden w-40 @md:flex">
              <Search size={14} aria-hidden /> Search
            </span>
            <span className="sp-btn sp-btn--ghost sp-btn--sm" aria-hidden>
              <Bell size={16} />
            </span>
            <span className="sp-btn sp-btn--primary sp-btn--sm">New invoice</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Outstanding", "€12,480"],
              ["Paid", "€48,210"],
              ["Overdue", "€1,170"],
            ].map(([k, v]) => (
              <div key={k} className="sp-card grid gap-0.5 p-3">
                <span className="sp-caption">{k}</span>
                <span className="sp-h3 sp-num">{v}</span>
              </div>
            ))}
          </div>
          <div className="sp-table">
            {ROWS.map(([who, status, amount, tone]) => (
              <div
                key={who}
                className="sp-label flex items-center gap-3 px-3 py-2.5"
                style={{ fontWeight: 400 }}
              >
                <span className="mr-auto">{who}</span>
                <span className={`sp-badge sp-badge--${tone}`}>{status}</span>
                <span className="sp-mono w-24 text-right">{amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Scope>
  );
}

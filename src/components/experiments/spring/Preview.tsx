"use client";

import { ArrowRight, ChevronDown, CircleAlert } from "lucide-react";
import type { Mode } from "@/lib/spring/color";
import type { System } from "@/lib/spring/system";
import type { Role } from "@/lib/spring/type";
import { Scope } from "./Scope";
import { useCopy } from "./store";

/** Display sizes fit about two words on one line, so the ladder shows the name, not the sentence. */
const displayOf = (name: string) =>
  name.trim() && name !== "Untitled" ? name.trim() : "Ship calm";
const lineOf = (l: string) => l.trim() || "A short line about what it does and who it helps.";

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
          <span className="sp-badge sp-badge--primary">New</span>
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

const CHANGES = [
  [
    "18 Nov",
    "Recurring invoices",
    "Bill retainers on a schedule; edits apply to the next run.",
    "New",
    "primary",
  ],
  [
    "11 Nov",
    "Faster PDF export",
    "Exports render in under a second, fonts embedded.",
    "Improved",
    "success",
  ],
  [
    "4 Nov",
    "Rounding on VAT lines",
    "Totals now round per line, as most EU tax offices expect.",
    "Fix",
    "info",
  ],
] as const;

/** A marketing page: the visitor's own line as the headline, then a changelog with real jobs for every role. */
export function Homepage({ system, mode, line }: { system: System; mode: Mode; line: string }) {
  const name = system.input.name || "Untitled";
  return (
    <Scope system={system} mode={mode}>
      <nav className="flex items-center gap-5 px-6 py-4">
        <span className="sp-h3 mr-auto" style={{ fontSize: "var(--text-body-lg)" }}>
          {name}
        </span>
        <span className="sp-label sp-muted hidden @md:inline">Pricing</span>
        <span className="sp-label sp-muted hidden @md:inline">Changelog</span>
        <span className="sp-btn sp-btn--secondary sp-btn--sm">Sign in</span>
      </nav>
      <section className="grid gap-5 px-6 pt-10 pb-12">
        <div className="sp-display max-w-[16ch]">{lineOf(line)}</div>
        <p className="sp-lead max-w-[46ch]">
          Send invoices, chase late payers and close the month without a spreadsheet.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="sp-btn sp-btn--primary sp-btn--lg">
            Start free <ArrowRight size={16} aria-hidden />
          </span>
          <span className="sp-btn sp-btn--ghost sp-btn--lg">See pricing</span>
        </div>
      </section>
      <section className="sp-rule grid gap-1 px-6 pt-6 pb-8">
        <span className="sp-h3 pb-2">Changelog</span>
        {CHANGES.map(([date, title, body, tag, tone]) => (
          <div key={title} className="grid gap-x-6 gap-y-1 py-3 @md:grid-cols-[6rem_1fr_auto]">
            <span className="sp-mono sp-muted">{date}</span>
            <span className="grid gap-0.5">
              <span className="sp-label">{title}</span>
              <span className="sp-caption">{body}</span>
            </span>
            <span className={`sp-badge sp-badge--${tone} self-start justify-self-start`}>
              {tag}
            </span>
          </div>
        ))}
      </section>
    </Scope>
  );
}

const LINES = [
  ["Brand workshop", "2 days", "1,200.00", "2,400.00"],
  ["Design system setup", "1", "1,800.00", "1,800.00"],
  ["Component audit", "6 h", "60.00", "360.00"],
] as const;

/** One real app screen: an invoice billed by the visitor's brand, where status, numbers and a form all have a job. */
export function AppScreen({ system, mode }: { system: System; mode: Mode }) {
  const name = system.input.name || "Untitled";
  return (
    <Scope system={system} mode={mode}>
      <div className="grid gap-5 p-6">
        <span className="sp-caption">Invoices / 0142</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="sp-h2 mr-auto">Northwind Studio</span>
          <span className="sp-badge sp-badge--warning">Due in 3 days</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 @md:grid-cols-4">
          {(
            [
              ["From", name, ""],
              ["Issued", "12 Nov 2026", ""],
              ["Due", "26 Nov 2026", "sp-text-warning"],
              ["Total", "€5,517.60", "sp-num"],
            ] as const
          ).map(([k, v, c]) => (
            <div key={k} className="grid gap-0.5">
              <dt className="sp-caption">{k}</dt>
              <dd className={`sp-label ${c}`}>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="sp-table">
          {LINES.map(([item, qty, unit, sum]) => (
            <div
              key={item}
              className="grid grid-cols-[1fr_auto] gap-x-4 px-4 py-3 @md:grid-cols-[1fr_5rem_7rem_7rem]"
            >
              <span className="sp-label" style={{ fontWeight: 400 }}>
                {item}
                <span className="sp-caption block @md:hidden">
                  {qty} × €{unit}
                </span>
              </span>
              <span className="sp-mono sp-muted hidden text-right @md:block">{qty}</span>
              <span className="sp-mono sp-muted hidden text-right @md:block">{unit}</span>
              <span className="sp-mono text-right">{sum}</span>
            </div>
          ))}
          <div className="sp-sub grid grid-cols-[1fr_auto] gap-x-4 px-4 py-3">
            <span className="sp-caption">Subtotal 4,560.00 · VAT 21% 957.60</span>
            <span className="sp-mono sp-label text-right">€5,517.60</span>
          </div>
        </div>
        <div className="grid gap-1.5">
          <span className="sp-label">Note to client</span>
          <span className="sp-field sp-muted">Thanks for a great kickoff.</span>
          <span className="sp-caption">Printed under the total.</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="sp-btn sp-btn--primary">Send invoice</span>
          <span className="sp-btn sp-btn--secondary">Save draft</span>
        </div>
      </div>
    </Scope>
  );
}

const SAMPLE: Partial<Record<Role, string>> = {
  h1: "Page title",
  h2: "Section title",
  h3: "Card and group title",
  "body-lg": "Lead paragraphs open a page and set its tone.",
  body: "Running text carries most of the product, so it gets the calmest line height.",
  label: "Save changes",
  caption: "Updated 3 min ago by Ana",
  code: "const total = 48210.5;",
};

/**
 * Every role at its desktop size, with the numbers a developer copies:
 * phone–desktop size, line height on the 4px grid, weight and tracking,
 * all derived per role rather than one line height for every row.
 */
export function Ladder({ system, mode }: { system: System; mode: Mode }) {
  const [copied, copy, said] = useCopy();
  return (
    <Scope system={system} mode={mode}>
      <output className="sr-only">{said}</output>
      <div className="grid">
        {system.type.tokens.map((t) => {
          const px = t.max;
          return (
            <div key={t.role} className="spring-rung">
              <span className="sp-mono sp-muted spring-rung__spec">
                <span className="sp-label" style={{ fontFamily: "var(--font-mono)" }}>
                  {t.role}
                </span>
                <span>
                  {t.min === t.max ? px : `${t.min}–${px}`}px / {t.lineHeightPx}
                </span>
                <span>
                  {t.weight}
                  {t.tracking ? ` · ${t.tracking > 0 ? "+" : ""}${t.tracking}em` : ""}
                </span>
                <button
                  type="button"
                  className="spring-rung__copy"
                  title={t.size}

                  onClick={() =>
                    copy(
                      t.role,
                      `font-size: ${t.size};\nline-height: ${t.lineHeight};\nletter-spacing: ${t.tracking}em;\nfont-weight: ${t.weight};`,
                    )
                  }
                >
                  {copied === t.role ? "Copied" : "Copy CSS"}
                  <span className="sr-only"> for {t.role}</span>
                </button>
              </span>
              <span
                className="spring-rung__sample"
                data-one-line={t.role === "display" || undefined}
                style={{
                  fontFamily: `"${t.family}", var(--font-${t.role === "code" ? "mono" : ["display", "h1", "h2", "h3"].includes(t.role) ? "heading" : "body"})`,
                  fontSize: px,
                  lineHeight: t.lineHeight,
                  letterSpacing: `${t.tracking}em`,
                  fontWeight: t.weight,
                }}
              >
                {t.role === "display" ? displayOf(system.input.name) : SAMPLE[t.role]}
              </span>
            </div>
          );
        })}
      </div>
    </Scope>
  );
}

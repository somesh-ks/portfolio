"use client";

import { ArrowRight } from "lucide-react";
import type { Mode } from "@/lib/spring/color";
import { formatOf, typeName, typeSnippet } from "@/lib/spring/names";
import type { System } from "@/lib/spring/system";
import type { Role } from "@/lib/spring/type";
import { Scope } from "./Scope";
import { useCopy } from "./store";

/** Display sizes fit about two words on one line, so the ladder shows the name, not the sentence. */
const displayOf = (name: string) =>
  name.trim() && name !== "Untitled" ? name.trim() : "Ship calm";

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

/** A marketing page: a headline, then a changelog with real jobs for every role. */
export function Homepage({ system, mode }: { system: System; mode: Mode }) {
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
        <div className="sp-display max-w-[16ch]">Invoices that chase themselves</div>
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
  const format = formatOf(system.input.stack);
  return (
    <Scope system={system} mode={mode}>
      <output className="sr-only">{said}</output>
      <div className="grid">
        <div className="spring-rung spring-rung--head sp-mono sp-muted" aria-hidden>
          token · phone–desktop / line · weight · tracking
        </div>
        {system.type.tokens.map((t) => {
          const px = t.max;
          return (
            <div key={t.role} className="spring-rung">
              <span className="sp-mono sp-muted spring-rung__spec">
                {/* The name is the copy button: one action per row, no extra column. */}
                <button
                  type="button"
                  className="sp-label spring-rung__copy"
                  onClick={() => copy(t.role, typeSnippet(t.role, format))}
                >
                  {copied === t.role ? (
                    "copied"
                  ) : (
                    <>
                      {typeName(t.role, format)}
                      <span className="sr-only"> copy</span>
                    </>
                  )}
                </button>
                <span>
                  {t.min === t.max ? px : `${t.min}–${px}`}px / {t.lineHeightPx} · {t.weight}
                  {t.tracking ? ` · ${t.tracking > 0 ? "+" : ""}${t.tracking}em` : ""}
                </span>
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

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TEAMS = [
  ["Support", -3],
  ["Sales", 2],
  ["Design", 4],
  ["Ops", -1],
  ["Legal", 0],
  ["Data", 3],
] as const;
const STATS = [
  ["Revenue", "€48.2k", ""],
  ["Visitors", "12,480", ""],
  ["Change", "+4.1%", "sp-text-success"],
] as const;

/** A reports screen in the same app as the invoice: series as grouped bars, the amounts ramp as a heatmap, above/below as change. */
export function ChartsScreen({ system, mode }: { system: System; mode: Mode }) {
  const c = system.charts;
  const marks = c.marks[mode];
  const seq = c.sequential[mode];
  const div = c.diverging[mode];
  const markOf = (key: string | undefined, fallback: string | undefined) => {
    const i = system.data.findIndex((d) => d.key === key);
    return (i >= 0 ? marks[i] : undefined) ?? fallback ?? "";
  };
  const below = markOf(c.div?.[0], div[0]);
  const above = markOf(c.div?.[1], div.at(-1));
  const nameOf = (key?: string) => system.data.find((d) => d.key === key)?.name ?? "";
  if (!marks.length)
    return (
      <Scope system={system} mode={mode}>
        <p className="sp-body sp-muted p-6">Add data colors to see them in charts.</p>
      </Scope>
    );
  const w = 100 / (QUARTERS.length * (marks.length + 1));
  return (
    <Scope system={system} mode={mode}>
      <div className="grid gap-5 p-6">
        <span className="sp-caption">Reports / November</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="sp-h2 mr-auto">Monthly report</span>
          <span className="sp-badge sp-badge--success">On track</span>
        </div>
        <dl className="grid grid-cols-3 gap-x-6 gap-y-3">
          {STATS.map(([k, v, cls]) => (
            <div key={k} className="grid gap-0.5">
              <dt className="sp-caption">{k}</dt>
              <dd className={`sp-label sp-num ${cls}`}>{v}</dd>
            </div>
          ))}
        </dl>
        <section className="sp-card grid gap-3 p-4">
          <span className="sp-label">Revenue by region</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {system.data.map((d, i) => (
              <span key={d.key} className="sp-caption inline-flex items-center gap-1.5">
                <span className="inline-block size-2" style={{ background: marks[i] }} />
                {d.name}
              </span>
            ))}
          </div>
          <svg
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            className="h-36 w-full"
            role="img"
            aria-label="Revenue by region, grouped bars, one color per series"
          >
            {QUARTERS.flatMap((q, gi) =>
              system.data.map((d, i) => {
                const h = 36 * (0.35 + 0.6 * Math.abs(Math.sin(gi * 2.3 + i * 1.7)));
                return (
                  <rect
                    key={`${q}-${d.key}`}
                    x={(gi * (marks.length + 1) + i + 0.5) * w}
                    y={40 - h}
                    width={w}
                    height={h}
                    fill={marks[i]}
                    stroke="var(--chart-gap)"
                    strokeWidth={0.3}
                  />
                );
              }),
            )}
            <line
              x1={0}
              x2={100}
              y1={39.8}
              y2={39.8}
              stroke="var(--color-border-strong)"
              strokeWidth={0.4}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span className="sp-caption sp-mono grid grid-cols-4 text-center">
            {QUARTERS.map((q) => (
              <span key={q}>{q}</span>
            ))}
          </span>
        </section>
        <div className="grid items-start gap-5 @md:grid-cols-2">
          {seq.length ? (
            <section className="sp-card grid content-start gap-3 p-4">
              <span className="sp-label">Visitors by hour</span>
              <div className="grid gap-0.5" title={`${nameOf(c.seq)}, light to dark`}>
                {DAYS.map((day, r) => (
                  <div key={day} className="grid grid-cols-[2.25rem_repeat(12,1fr)] gap-0.5">
                    <span className="sp-caption">{day}</span>
                    {Array.from({ length: 12 }, (_, h) => {
                      const v = Math.sin(h / 3.2 + r * 0.4) * 0.5 + 0.5 - (r > 4 ? 0.3 : 0);
                      const k = Math.max(
                        0,
                        Math.min(seq.length - 1, Math.round(v * (seq.length - 1))),
                      );
                      return (
                        <span key={`${day}-${h}`} className="h-4" style={{ background: seq[k] }} />
                      );
                    })}
                  </div>
                ))}
              </div>
              <span className="sp-caption flex items-center gap-2">
                fewer
                <span
                  className="h-1.5 flex-1"
                  style={{ background: `linear-gradient(to right, ${seq.join(", ")})` }}
                />
                more
              </span>
            </section>
          ) : null}
          {div.length ? (
            <section className="sp-card grid content-start gap-3 p-4">
              <span className="sp-label">Change vs last month</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="sp-caption inline-flex items-center gap-1.5">
                  <span className="inline-block size-2" style={{ background: below }} />
                  down
                </span>
                <span className="sp-caption inline-flex items-center gap-1.5">
                  <span className="inline-block size-2" style={{ background: above }} />
                  up
                </span>
              </div>
              <div className="grid gap-1.5">
                {TEAMS.map(([team, v]) => (
                  <div key={team} className="grid grid-cols-[3.5rem_1fr_1fr_2rem] items-center">
                    <span className="sp-caption">{team}</span>
                    <span
                      className="flex h-4 justify-end border-r"
                      style={{ borderColor: "var(--color-border-strong)" }}
                    >
                      {v < 0 ? (
                        <span style={{ width: `${(-v / 4) * 100}%`, background: below }} />
                      ) : null}
                    </span>
                    <span className="flex h-4">
                      {v > 0 ? (
                        <span style={{ width: `${(v / 4) * 100}%`, background: above }} />
                      ) : null}
                    </span>
                    <span className="sp-mono sp-muted text-right">
                      {v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </Scope>
  );
}

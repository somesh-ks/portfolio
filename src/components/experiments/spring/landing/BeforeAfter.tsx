"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { contrast } from "@/lib/spring/color";
import { buildSystem, inputFromSeed } from "@/lib/spring/system";

const BRAND = "#3b82f6";
const r = (n: number) => n.toFixed(2);
const verdict = (x: number) => (x >= 7 ? "AAA" : x >= 4.5 ? "AA" : "fail");

/**
 * The same billing screen twice. Before: the drift a scan finds in a real app (three
 * near-identical blues, a white label on the brand fill, gray-400 meta text, four
 * unscaled sizes on the browser's line height). After: Spring's roles from that blue.
 */
const BEFORE = {
  bg: "#ffffff",
  panel: "#f9fafb",
  text: "#111827",
  muted: "#9ca3af",
  border: "#e5e7eb",
  primary: BRAND,
  primaryFg: "#ffffff",
  link: "#3d84f5",
  meter: "#2f7de9",
  track: "#f3f4f6",
  badge: "#dcfce7",
  badgeFg: "#22c55e",
  title: [17, "normal"],
  body: [15, "normal"],
  meta: [13, "normal"],
  button: [14, "normal"],
  radius: [10, 6],
} as const;

const BEFORE_SWATCHES = [
  "#3b82f6",
  "#3d84f5",
  "#2f7de9",
  "#111827",
  "#9ca3af",
  "#6b7280",
  "#e5e7eb",
  "#f3f4f6",
  "#f9fafb",
  "#22c55e",
  "#dcfce7",
];

export type Look = {
  bg: string;
  panel: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primaryFg: string;
  link: string;
  meter: string;
  track: string;
  badge: string;
  badgeFg: string;
  title: readonly [number, number | "normal"];
  body: readonly [number, number | "normal"];
  meta: readonly [number, number | "normal"];
  button: readonly [number, number | "normal"];
  radius: readonly [number, number];
};

const lh = (v: number | "normal") => (v === "normal" ? "normal" : `${v}px`);

function vars(l: Look): CSSProperties {
  return {
    "--ba-bg": l.bg,
    "--ba-panel": l.panel,
    "--ba-text": l.text,
    "--ba-muted": l.muted,
    "--ba-border": l.border,
    "--ba-primary": l.primary,
    "--ba-primary-fg": l.primaryFg,
    "--ba-link": l.link,
    "--ba-meter": l.meter,
    "--ba-track": l.track,
    "--ba-badge": l.badge,
    "--ba-badge-fg": l.badgeFg,
    "--ba-title": `${l.title[0]}px`,
    "--ba-title-lh": lh(l.title[1]),
    "--ba-body": `${l.body[0]}px`,
    "--ba-body-lh": lh(l.body[1]),
    "--ba-meta": `${l.meta[0]}px`,
    "--ba-meta-lh": lh(l.meta[1]),
    "--ba-button": `${l.button[0]}px`,
    "--ba-button-lh": lh(l.button[1]),
    "--ba-r-card": `${l.radius[0]}px`,
    "--ba-r-ctl": `${l.radius[1]}px`,
  } as CSSProperties;
}

export function Card({ look, hidden }: { look: Look; hidden?: boolean }) {
  return (
    <div className="spring-ba__card" style={vars(look)} aria-hidden={hidden || undefined}>
      <div className="spring-ba__head">
        <p className="spring-ba__title">Plan and billing</p>
        <span className="spring-ba__badge">Active</span>
      </div>
      <div className="spring-ba__plan">
        <p className="spring-ba__body">
          <b>Pro</b> · $24/month
        </p>
        <p className="spring-ba__meta">Renews 12 Dec</p>
      </div>
      <div className="spring-ba__usage">
        <p className="spring-ba__meta">8,420 of 10,000 requests</p>
        <span className="spring-ba__track">
          <span />
        </span>
      </div>
      <div className="spring-ba__actions">
        <span className="spring-ba__btn">Upgrade plan</span>
        <span className="spring-ba__btn spring-ba__btn--ghost">Cancel plan</span>
        <span className="spring-ba__link">View invoices</span>
      </div>
    </div>
  );
}

/** Spring's system from one brand color, as the card's look plus what the page shows of it. */
export function springLook(brand: string) {
  const sys = buildSystem(inputFromSeed(brand));
  const role = Object.fromEntries(sys.roles.light.map((x) => [x.name, x.hex]));
  const byRole = Object.fromEntries(sys.type.tokens.map((t) => [t.role, t]));
  const t = (n: string) => [byRole[n]!.min, byRole[n]!.lineHeightPx] as const;
  const look: Look = {
    bg: role.bg!,
    panel: role["bg-subtle"]!,
    text: role.text!,
    muted: role["text-muted"]!,
    border: role["border-subtle"]!,
    primary: role.primary!,
    primaryFg: role["primary-fg"]!,
    link: role["primary-text"]!,
    meter: role.primary!,
    track: role.fill!,
    badge: role["success-subtle"]!,
    badgeFg: role["success-text"]!,
    title: t("h3"),
    body: t("body"),
    meta: t("caption"),
    button: t("label"),
    radius: [sys.shape.radius.lg, sys.shape.radius.md],
  };
  const checks = [...sys.checks.light, ...sys.checks.dark].filter((c) => !c.advisory);
  return {
    look,
    ramp: sys.scales.primary.light.map((x) => x.hex),
    rampDark: sys.scales.primary.dark.map((x) => x.hex),
    type: ["h3", "body", "label", "caption"].map((n) => ({
      role: n,
      size: byRole[n]!.min,
      lh: byRole[n]!.lineHeightPx,
      weight: byRole[n]!.weight,
    })),
    pass: checks.filter((c) => c.pass).length,
    total: checks.length,
  };
}

/** The proof: one screen before and after Spring, split by a handle the visitor drags. */
export function BeforeAfter() {
  const [split, setSplit] = useState(50);
  const m = useMemo(() => {
    const { look: after, ramp, type } = springLook(BRAND);
    return {
      after,
      ramp,
      label: [contrast(BEFORE.primaryFg, BEFORE.primary), contrast(after.primaryFg, after.primary)],
      meta: [contrast(BEFORE.muted, BEFORE.bg), contrast(after.muted, after.bg)],
      sizes: type.map((t) => `${t.size}/${t.lh}`),
    };
  }, []);
  return (
    <figure className="spring-ba" aria-labelledby="spring-ba-cap">
      <div className="spring-ba__bar" aria-hidden="true">
        <span>acme.app/settings/billing</span>
        <span>
          <b>before</b> · <b>after</b>
        </span>
      </div>
      <div className="spring-ba__body-grid">
        <div
          className="spring-ba__stage spring-ba__stage--compare"
          style={{ "--split": `${split}%` } as CSSProperties}
        >
          <Card look={BEFORE} />
          <div className="spring-ba__after">
            <Card look={m.after} hidden />
          </div>
          <span className="spring-ba__handle" aria-hidden="true" />
          <input
            type="range"
            min={0}
            max={100}
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
            className="spring-ba__range"
            aria-label="Before and after: drag to compare"
            aria-valuetext={`${100 - split}% after`}
          />
        </div>
        <ol className="spring-ba__notes">
          <li>
            <span className="spring-ba__k">Button label</span>
            <span>
              <s>white {r(m.label[0]!)}</s> → navy {r(m.label[1]!)} <b>{verdict(m.label[1]!)}</b>
            </span>
          </li>
          <li>
            <span className="spring-ba__k">Meta text</span>
            <span>
              <s>gray-400 {r(m.meta[0]!)}</s> → {r(m.meta[1]!)} <b>{verdict(m.meta[1]!)}</b>
            </span>
          </li>
          <li>
            <span className="spring-ba__k">Blues</span>
            <span>
              <s>3 near-identical blues</s> → one 12-step scale
            </span>
          </li>
          <li>
            <span className="spring-ba__k">Type</span>
            <span>
              <s>4 sizes, no line height</s> → {m.sizes.length} roles on a 4px grid
            </span>
          </li>
        </ol>
      </div>
      <div className="spring-ba__strip" aria-hidden="true">
        <span className="spring-ba__k">before · 11 values</span>
        <span className="spring-ba__sw spring-ba__sw--loose">
          {BEFORE_SWATCHES.map((c) => (
            <i key={c} style={{ background: c }} />
          ))}
        </span>
        <span className="spring-ba__k">after · 1 scale</span>
        <span className="spring-ba__sw">
          {m.ramp.map((c) => (
            <i key={c} style={{ background: c }} />
          ))}
        </span>
      </div>
      <figcaption id="spring-ba-cap" className="sr-only">
        A billing screen before and after Spring. The button label goes from {r(m.label[0]!)} to{" "}
        {r(m.label[1]!)} to 1, the meta text from {r(m.meta[0]!)} to {r(m.meta[1]!)} to 1, three
        near-identical blues become one scale, and four unscaled sizes become type roles with line
        heights.
      </figcaption>
    </figure>
  );
}

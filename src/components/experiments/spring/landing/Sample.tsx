"use client";

/* The sample billing screen the hero playground rebuilds from a brand color. */
import type { CSSProperties } from "react";
import { buildSystem, inputFromSeed } from "@/lib/spring/system";

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

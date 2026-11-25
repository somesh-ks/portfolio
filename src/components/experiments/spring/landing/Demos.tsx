"use client";

import { useEffect, useId, useMemo, type ReactNode } from "react";
import { contrast } from "@/lib/spring/color";
import { buildSystem, inputFromSeed } from "@/lib/spring/system";
import { useLandingMotion } from "./Motion";

/**
 * One flow of the skill: a heading, then one wide box with the command on the
 * left and what it gives you on the right. Fixed height, so nothing shifts.
 */
function Flow({
  title,
  line,
  term,
  children,
}: {
  title: string;
  line: string;
  term: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="spring-flow" aria-labelledby={id}>
      <header className="spring-flow__head">
        <h2 id={id}>{title}</h2>
        <p>{line}</p>
      </header>
      <div className="spring-flow__box">
        <div className="spring-term">{term}</div>
        <div className="spring-flow__vis">{children}</div>
      </div>
    </section>
  );
}

/* From `spring scan src` and the audit of this site's tokens (2026-11-25). */
const SCAN = {
  tokens: 168,
  used: 111,
  raw: 54,
  pin: ["#A29AFF", "CompanyLogo.tsx:29"],
} as const;
const FINDINGS = [
  ["Sizes don't follow a scale", "×1.07 to ×1.18"],
  ["18 sizes without a line height", "browser default"],
  ["Roles named by their color", "illustration-sky"],
] as const;
const FIXES = ["One ratio, applied to roles.", "Line height per role, on a 4px grid."];

/* ---------- Show: scan, then the View ---------- */

const DEAD = (() => {
  // A fixed scatter, so the server and the browser draw the same grid.
  let s = 11;
  const out = new Set<number>();
  while (out.size < SCAN.tokens - SCAN.used)
    out.add(Math.floor(((s = (s * 16807) % 2147483647) / 2147483647) * SCAN.tokens));
  return out;
})();

export function ShowFlow() {
  const { tick, paused } = useLandingMotion();
  // At rest (paused or reduced motion) the picture shows its finding.
  const show = paused || tick % 2 === 1;
  return (
    <Flow
      title="Show what you have"
      line="Your agent scans the repo. You see every token, per theme, in View."
      term={
        <>
          <p className="spring-term__cmd">spring scan . --open</p>
          <p>Tokens: {SCAN.tokens}, light and dark</p>
          <p>
            Used: {SCAN.used} of {SCAN.tokens}
          </p>
          <p>Raw colors: {SCAN.raw}, with path:line</p>
          <p>Findings: {FINDINGS.length} to look at</p>
          <p className="spring-term__hi">View: opened in your browser</p>
        </>
      }
    >
      <div className="spring-unused" data-show={show || undefined}>
        <div className="spring-unused__cells" aria-hidden="true">
          {Array.from({ length: SCAN.tokens }, (_, i) => (
            <i key={i} data-dead={DEAD.has(i) || undefined} />
          ))}
        </div>
        <p className="spring-unused__stat">
          <span className="spring-unused__num">{show ? SCAN.used : SCAN.tokens}</span>
          <span className="spring-unused__lbl">{show ? "used" : "tokens"}</span>
        </p>
        <p className="spring-unused__pin">
          <b style={{ background: SCAN.pin[0] }} aria-hidden="true" />
          <span>{SCAN.pin[0]}</span> {SCAN.pin[1]}
        </p>
        <p className="sr-only">
          From a scan of this site: {SCAN.used} of {SCAN.tokens} tokens used, {SCAN.raw} raw colors.
        </p>
      </div>
    </Flow>
  );
}

/* ---------- Make: one color, through the tiers, to a button that passes ---------- */

const verdict = (r: number) => (r >= 7 ? "AAA" : r >= 4.5 ? "AA" : "fail");

export function MakeFlow() {
  const { seed } = useLandingMotion();
  const m = useMemo(() => {
    const sys = buildSystem(inputFromSeed(seed));
    const roles = sys.roles.light;
    const role = (n: string) => roles.find((r) => r.name === n)!;
    const primary = role("primary");
    const fg = role("primary-fg").hex;
    return {
      step: primary.from.replace(".", "-"),
      bg: primary.hex,
      fg,
      ours: contrast(fg, primary.hex),
      white: contrast("#ffffff", primary.hex),
    };
  }, [seed]);
  return (
    <Flow
      title="Make the one you want"
      line="One brand color in. Primitives, roles and files out, light and dark."
      term={
        <>
          <p className="spring-term__cmd">spring build --primary {seed}</p>
          <p>
            <span className="spring-term__hi">tokens.css</span> primitives and roles
          </p>
          <p>
            <span className="spring-term__hi">tokens.json</span> DTCG
          </p>
          <p>
            <span className="spring-term__hi">theme.css</span> Tailwind v4, shadcn names
          </p>
          <p>
            <span className="spring-term__hi">DESIGN.md</span> and{" "}
            <span className="spring-term__hi">SKILL.md</span> for your agent
          </p>
          <p className="spring-term__hi">Edit: tune it by eye in the app</p>
        </>
      }
    >
      <div className="spring-tiers" aria-hidden="true">
        <div className="spring-tiers__row">
          <span className="spring-tiers__chip" style={{ background: m.bg }} />
          <code>--{m.step}</code>
          <span className="spring-tiers__kind">primitive</span>
        </div>
        <div className="spring-tiers__row">
          <span className="spring-tiers__chip" style={{ background: m.bg }} />
          <code>--color-primary</code>
          <span className="spring-tiers__kind">role</span>
        </div>
        <div className="spring-tiers__row">
          <span className="spring-tiers__button" style={{ background: m.bg, color: m.fg }}>
            Save
          </span>
          <span className="spring-tiers__pass">
            <span>white {m.white.toFixed(2)}</span>{" "}
            <b data-v={verdict(m.white) === "fail" ? "fail" : "pass"}>{verdict(m.white)}</b>
            <span> · label {m.ours.toFixed(2)}</span> <b data-v="pass">{verdict(m.ours)}</b>
          </span>
        </div>
      </div>
      <p className="sr-only">
        {seed} becomes the primitive {m.step}, the role color-primary, and a button whose label
        passes at {m.ours.toFixed(2)} to 1.
      </p>
    </Flow>
  );
}

/* ---------- Rebuild: the audit, then clean up into the app ---------- */

export function RebuildFlow() {
  return (
    <Flow
      title="Rebuild without the drift"
      line="Spring reads the mess, says what's off, and opens a clean system in the app."
      term={
        <>
          <p className="spring-term__cmd">spring infer . --out spring.json</p>
          <p>Brand: gray, from the solid fills</p>
          <p>Type: Inter, 14px × 1.167</p>
          <p>Radius: 0</p>
          <p className="spring-term__hi">Edit: open it in the app</p>
        </>
      }
    >
      <div className="spring-audit-card">
        <ul>
          {FINDINGS.map(([t, d]) => (
            <li key={t}>
              <span aria-label="warn">!</span> {t}. <span className="spring-term__dim">{d}</span>
            </li>
          ))}
        </ul>
        <ul className="spring-audit-card__fixes">
          {FIXES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <span className="spring-audit-card__btn" aria-hidden="true">
          Clean up in Spring
        </span>
      </div>
    </Flow>
  );
}

/** The app used to live at /spring, so its #audit link lands there; send it on. */
export function OldAppLinks() {
  useEffect(() => {
    if (location.hash === "#audit") location.replace("/spring/app#audit");
  }, []);
  return null;
}

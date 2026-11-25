"use client";

import { useEffect, useId, useMemo, type ReactNode } from "react";
import { contrast } from "@/lib/spring/color";
import { buildSystem, inputFromSeed } from "@/lib/spring/system";
import { scaleFor } from "./Hero";
import { useLandingMotion } from "./Motion";

/** A fixed-size tile: step, who does it, one picture, one caption. Nothing in it resizes. */
function Tile({
  step,
  who,
  caption,
  children,
}: {
  step: string;
  who: string;
  caption: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="spring-tile" aria-labelledby={id}>
      <h3 id={id} className="spring-tile__title">
        <span>{step}</span>
        <span className="spring-tile__who">{who}</span>
      </h3>
      <div className="spring-tile__vis">{children}</div>
      <p className="spring-tile__caption">{caption}</p>
    </section>
  );
}

/* From `spring scan src` on this site (2026-11-25). */
const SCAN = {
  tokens: 168,
  used: 111,
  raw: 54,
  pin: ["#A29AFF", "CompanyLogo.tsx:29"],
  view: "someshks.com/spring/view#d=rVtpj9u6Ff0rqpoHJK2l",
} as const;

/* ---------- 1. Scan: the skill's own summary ---------- */

export function ScanTile() {
  return (
    <Tile step="1 Scan" who="your agent" caption="Reads CSS, Tailwind, DTCG and DESIGN.md.">
      <div className="spring-term">
        <p className="spring-term__cmd">spring scan .</p>
        <p>Tokens: {SCAN.tokens}, light and dark</p>
        <p>
          Used: {SCAN.used} of {SCAN.tokens}
        </p>
        <p>Raw colors: {SCAN.raw}</p>
        <p>Pairs under 4.5:1: 0</p>
        <p className="spring-term__hi">View: {SCAN.view}</p>
      </div>
    </Tile>
  );
}

/* ---------- 2. See: the View dims what's never used ---------- */

const DEAD = (() => {
  // A fixed scatter, so the server and the browser draw the same grid.
  let s = 11;
  const out = new Set<number>();
  while (out.size < SCAN.tokens - SCAN.used)
    out.add(Math.floor(((s = (s * 16807) % 2147483647) / 2147483647) * SCAN.tokens));
  return out;
})();

export function SeeTile() {
  const { tick, paused } = useLandingMotion();
  // At rest (paused or reduced motion) the tile shows its finding.
  const show = paused || tick % 2 === 1;
  return (
    <Tile step="2 See" who="you, in View" caption="Every primitive per theme, with what's unused.">
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
    </Tile>
  );
}

/* ---------- 3. Make: one color, 12 steps, a label that passes ---------- */

const verdict = (r: number) => (r >= 7 ? "AAA" : r >= 4.5 ? "AA" : "fail");

export function MakeTile() {
  const { seed } = useLandingMotion();
  const { ramp, pairs } = useMemo(() => {
    const roles = buildSystem(inputFromSeed(seed)).roles.light;
    const role = (n: string) => roles.find((r) => r.name === n)!.hex;
    const bg = role("primary");
    const fg = role("primary-fg");
    return {
      ramp: scaleFor(seed).light,
      pairs: [
        { who: "white on brand", bg: seed, fg: "#ffffff", r: contrast("#ffffff", seed) },
        { who: "Spring's label", bg, fg, r: contrast(fg, bg) },
      ],
    };
  }, [seed]);
  return (
    <Tile
      step="3 Make"
      who="you, in the app"
      caption="One color in. Labels that pass, light and dark."
    >
      <div className="spring-make">
        <p className="spring-make__seed">
          <span>--primary {seed}</span>
          <span>12 steps</span>
        </p>
        <div className="spring-make__ramp" aria-hidden="true">
          {ramp.map((s) => (
            <span key={s.step} style={{ background: s.hex }} />
          ))}
        </div>
        <div className="spring-pairs">
          {pairs.map((p) => {
            const v = verdict(p.r);
            return (
              <figure key={p.who} className="spring-pair">
                <figcaption className="spring-pair__who">{p.who}</figcaption>
                <div
                  className="spring-pair__sw"
                  style={{ background: p.bg, color: p.fg }}
                  aria-hidden="true"
                >
                  Aa
                </div>
                <p className="spring-pair__r">
                  <span>{p.r.toFixed(2)}</span>
                  <b data-v={v === "fail" ? "fail" : "pass"}>{v}</b>
                </p>
              </figure>
            );
          })}
        </div>
      </div>
    </Tile>
  );
}

/* ---------- 4. Ship: what `spring build` writes ---------- */

const FILES = [
  ["tokens.css", ""],
  ["tokens.json", "DTCG"],
  ["theme.css", "Tailwind v4, shadcn names"],
  ["DESIGN.md", ""],
  ["SKILL.md", "for your agent"],
  ["AGENTS.md", ""],
] as const;

export function ShipTile() {
  const { seed } = useLandingMotion();
  return (
    <Tile step="4 Ship" who="your agent" caption="Files for your repo and your agent.">
      <div className="spring-term">
        <p className="spring-term__cmd">spring build --primary {seed}</p>
        {FILES.map(([f, note]) => (
          <p key={f}>
            <span className="spring-term__dim">└</span> <span className="spring-term__hi">{f}</span>{" "}
            {note}
          </p>
        ))}
        <p className="spring-term__hi">Edit: someshks.com/spring/app?s=…</p>
      </div>
    </Tile>
  );
}

/** The app used to live at /spring, so its #audit link lands there; send it on. */
export function OldAppLinks() {
  useEffect(() => {
    if (location.hash === "#audit") location.replace("/spring/app#audit");
  }, []);
  return null;
}

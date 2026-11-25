"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, springLook } from "./Sample";
import { useLandingMotion } from "./Motion";

/** Brand colors of well-known systems, as each publishes them. */
const BRANDS = [
  ["Blue", "#3b82f6"],
  ["Violet", "#6e56cf"],
  ["Teal", "#00d1b2"],
  ["Red", "#dc3545"],
  ["Amber", "#f59e0b"],
  ["Green", "#008060"],
] as const;

/** Spring in the hero: pick a brand color and the whole screen rebuilds from it, live. */
export function Playground() {
  const { seed } = useLandingMotion();
  // Follows the page's brand clock until the visitor picks one.
  const [pick, setPick] = useState<string | null>(null);
  const brand = pick ?? seed;
  const m = useMemo(() => springLook(brand), [brand]);
  return (
    <figure className="spring-ba spring-play" aria-labelledby="spring-play-cap">
      <div className="spring-ba__bar spring-play__bar">
        <span id="spring-play-cap">pick a brand color</span>
        <span className="spring-play__swatches">
          {BRANDS.map(([name, hex]) => (
            <button
              key={hex}
              type="button"
              className="spring-play__swatch pressable"
              style={{ background: hex }}
              aria-label={name}
              aria-pressed={brand === hex}
              onClick={() => setPick(hex)}
            />
          ))}
          <label className="spring-play__custom" title="Any color">
            <span className="sr-only">Any color</span>
            <input type="color" value={brand} onChange={(e) => setPick(e.target.value)} />
          </label>
          <code>{brand}</code>
        </span>
      </div>
      <div className="spring-ba__body-grid">
        <div className="spring-ba__stage spring-play__stage">
          <Card look={m.look} />
        </div>
        <div className="spring-play__panel">
          <div>
            <p className="spring-ba__k">scale · light</p>
            <span className="spring-ba__sw" aria-hidden="true">
              {m.ramp.map((c) => (
                <i key={c} style={{ background: c }} />
              ))}
            </span>
          </div>
          <div>
            <p className="spring-ba__k">scale · dark</p>
            <span className="spring-ba__sw" aria-hidden="true">
              {m.rampDark.map((c) => (
                <i key={c} style={{ background: c }} />
              ))}
            </span>
          </div>
          <div>
            <p className="spring-ba__k">type</p>
            <ul className="spring-play__type">
              {m.type.map((t) => (
                <li key={t.role}>
                  <span style={{ fontSize: t.size, lineHeight: `${t.lh}px`, fontWeight: t.weight }}>
                    Ag
                  </span>
                  <code>{t.role}</code>
                  <span>
                    {t.size}/{t.lh}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="spring-play__pass">
            <b>
              {m.pass} of {m.total}
            </b>{" "}
            text pairs pass AA, light and dark
          </p>
        </div>
      </div>
      <div className="spring-play__foot">
        <span className="spring-ba__k spring-play__files">
          <span>tokens.css</span> <span>tokens.json</span> <span>theme.css</span>{" "}
          <span>DESIGN.md</span>
        </span>
        <Link
          href={`/spring/app?primary=${encodeURIComponent(brand)}`}
          className="spring-play__open"
        >
          Open this system in Spring <span aria-hidden="true">→</span>
        </Link>
      </div>
    </figure>
  );
}

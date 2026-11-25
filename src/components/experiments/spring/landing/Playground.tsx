"use client";

import Link from "next/link";
import { useState } from "react";
import type { BrandData } from "./data";
import { Card } from "./Sample";
import { useLandingMotion } from "./Motion";

/** Spring in the hero: pick a brand color and the whole screen rebuilds from it, live. */
export function Playground({ brands }: { brands: BrandData[] }) {
  const { seed } = useLandingMotion();
  // Follows the page's brand clock until the visitor picks one.
  const [pick, setPick] = useState<string | null>(null);
  const brand = pick ?? seed;
  const m = brands.find((b) => b.hex === brand) ?? brands[0]!;
  return (
    <figure className="spring-ba spring-play" aria-labelledby="spring-play-cap">
      <div className="spring-ba__bar spring-play__bar">
        <span id="spring-play-cap">pick a brand color</span>
        <span className="spring-play__swatches">
          {brands.map(({ name, hex }) => (
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

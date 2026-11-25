"use client";

import type { BrandData } from "./data";
import { useLandingMotion } from "./Motion";

/** What Spring makes from one color, each with a live readout of the brand on the clock. */
export function Features({ brands }: { brands: BrandData[] }) {
  const { seed } = useLandingMotion();
  const m = brands.find((b) => b.hex === seed) ?? brands[0]!;
  return (
    <section className="spring-feat" aria-labelledby="spring-feat-title">
      <h2 id="spring-feat-title" className="spring-h2">
        One color in. A whole system out.
      </h2>
      <ul className="spring-feat__grid">
        <li>
          <p className="spring-feat__k">01 scales</p>
          <h3>Twelve steps, light and dark</h3>
          <p>OKLCH scales for any hue: backgrounds, borders, solids and text, plus neutrals.</p>
          <div className="spring-feat__viz spring-feat__ramps" aria-hidden="true">
            {brands.map((b) => (
              <span key={b.hex} data-on={b.hex === m.hex || undefined}>
                {b.ramp.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
            ))}
          </div>
        </li>
        <li>
          <p className="spring-feat__k">02 roles</p>
          <h3>Named for the job</h3>
          <p>Steps map to roles, so code asks for primary or muted text, never blue-8.</p>
          <dl className="spring-feat__viz spring-feat__roles">
            {m.roles.map((r) => (
              <div key={r.name}>
                <dt>--color-{r.name}</dt>
                <dd>
                  <i aria-hidden="true" style={{ background: r.light }} />
                  <i aria-hidden="true" style={{ background: r.dark }} />
                  <span>{r.from.replace(".", "-")}</span>
                </dd>
              </div>
            ))}
          </dl>
        </li>
        <li>
          <p className="spring-feat__k">03 contrast</p>
          <h3>Every text pair checked</h3>
          <p>Each text and fill pair is measured in both modes against AA, AAA or APCA.</p>
          <table className="spring-feat__viz spring-feat__pairs">
            <thead>
              <tr>
                <th scope="col">pair</th>
                <th scope="col">light</th>
                <th scope="col">dark</th>
              </tr>
            </thead>
            <tbody>
              {m.pairs.map((p) => (
                <tr key={p.fg}>
                  <th scope="row">
                    <span aria-hidden="true" style={{ background: p.bgHex, color: p.fgHex }}>
                      Aa
                    </span>
                    {p.fg}
                  </th>
                  <td>{p.light.toFixed(2)}</td>
                  <td>{p.dark.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </li>
        <li>
          <p className="spring-feat__k">04 type</p>
          <h3>One ratio, every size</h3>
          <p>Pick a font, a base and a ratio. Line heights land on a 4px grid.</p>
          <ol className="spring-feat__viz spring-feat__ladder">
            {m.ladder.map((t) => (
              <li key={t.role}>
                <span aria-hidden="true" style={{ fontSize: t.size }}>
                  Ag
                </span>
                <code>{t.size}</code>
              </li>
            ))}
          </ol>
        </li>
        <li>
          <p className="spring-feat__k">05 export</p>
          <h3>Files your stack reads</h3>
          <p>CSS variables, a Tailwind v4 theme with shadcn names, DTCG JSON and DESIGN.md.</p>
          <pre className="spring-feat__viz spring-feat__code">
            <code>
              <span>{"/* tokens.css */"}</span>
              {m.css.map((l) => `\n${l}`)}
            </code>
          </pre>
        </li>
        <li>
          <p className="spring-feat__k">06 share</p>
          <h3>The link is the system</h3>
          <p>No account. The whole system lives in the URL, so whoever opens it gets yours.</p>
          <p className="spring-feat__viz spring-feat__link">
            <code>
              someshks.com/spring/app
              <wbr />
              ?primary=<b>{encodeURIComponent(m.hex)}</b>
            </code>
          </p>
        </li>
      </ul>
    </section>
  );
}

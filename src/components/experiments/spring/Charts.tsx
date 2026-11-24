"use client";

import { useId } from "react";
import type { Mode } from "@/lib/spring/color";
import { CHART_MAX, CVD_FILTER, VISION_LABEL, VISIONS, type ChartCheck } from "@/lib/spring/charts";
import { contrast } from "@/lib/spring/color";
import { formatColor, type ColorFormat } from "@/lib/spring/colormath";
import type { System, SystemInput } from "@/lib/spring/system";
import { Dial } from "@/components/ui/Dial";
import { useCopy } from "./store";

type Set = (f: (i: SystemInput) => SystemInput) => void;
const MARK = { pass: "✓", warn: "!", fail: "✕" } as const;
const deg = (h: number) => `${Math.round(h)}°`;

/** The Charts view's controls: the brand hue the series start from, how many to grade, the diverging end. */
export function ChartControls({
  system,
  input,
  setInput,
}: {
  system: System;
  input: SystemInput;
  setInput: Set;
}) {
  const charts = input.charts ?? {};
  const set = (p: typeof charts) => setInput((i) => ({ ...i, charts: { ...i.charts, ...p } }));
  const auto = charts.diverge === undefined || charts.diverge < 0;
  const div = auto ? system.charts.divergeHue : charts.diverge!;
  return (
    <>
      <p className="spring-group">series</p>
      <Dial
        label="brand hue"
        value={input.accent.hue}
        min={0}
        max={360}
        step={1}
        show={deg(input.accent.hue)}
        onChange={(v) => setInput((i) => ({ ...i, accent: { ...i.accent, hue: v } }))}
      />
      <Dial
        label="series"
        value={system.charts.count}
        min={4}
        max={CHART_MAX}
        step={1}
        reset={8}
        show={String(system.charts.count)}
        onChange={(v) => set({ count: v })}
      />
      <hr className="spring-rule" />
      <p className="spring-group">diverging</p>
      <Dial
        label="other end"
        value={div}
        min={0}
        max={359}
        step={1}
        show={auto ? `${deg(div)} auto` : deg(div)}
        reset={-1}
        onChange={(v) => set({ diverge: v })}
      />
      {auto ? null : (
        <button type="button" className="spring-link" onClick={() => set({ diverge: -1 })}>
          Pick the other end for me
        </button>
      )}
    </>
  );
}

function Strip({
  name,
  colors,
  shown = colors.length,
  page,
  format,
  copy,
  copied,
  token,
}: {
  name: string;
  colors: string[];
  shown?: number;
  page: string;
  format: ColorFormat;
  copy: (k: string, t: string) => void;
  copied: string | null;
  token: (i: number) => string;
}) {
  return (
    <div className="spring-scale">
      <span className="spring-strip">
        <span className="spring-strip__name">{name}</span>
      </span>
      <span
        className="spring-scale__steps"
        style={{ gridTemplateColumns: `repeat(${colors.length}, 1fr)` }}
      >
        {colors.map((hex, i) => {
          const key = token(i);
          const ratio = contrast(hex, page);
          return (
            <button
              type="button"
              key={key}
              data-key
              data-off={i >= shown || undefined}
              style={{ backgroundColor: hex, color: ratio > 4.5 ? page : "#000" }}
              title={`var(--${key}) ${formatColor(hex, format)} · ${ratio.toFixed(2)}:1 on bg${i >= shown ? " · exported, beyond the series you grade" : ""}`}
              onClick={() => copy(key, formatColor(hex, format))}
            >
              <span className="sr-only">Copy {key}</span>
              <span aria-hidden className="spring-step__ratio">
                {copied === key ? "✓" : i + 1}
              </span>
            </button>
          );
        })}
      </span>
    </div>
  );
}

/** Bars in series order, the way most charts will use them, with the 2px gap between touching marks. */
function Sample({ colors, page }: { colors: string[]; page: string }) {
  const groups = [0.55, 0.8, 0.45, 0.95];
  const w = 100 / (groups.length * (colors.length + 1));
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="spring-chart"
      role="img"
      aria-label="Sample bar chart using the series colors"
      style={{ background: page }}
    >
      {groups.flatMap((g, gi) =>
        colors.map((c, i) => {
          const h = 36 * g * (0.55 + 0.45 * Math.abs(Math.sin(gi * 3 + i * 1.7)));
          return (
            <rect
              key={`${g}-${c}`}
              x={(gi * (colors.length + 1) + i + 0.5) * w}
              y={40 - h}
              width={w}
              height={h}
              fill={c}
              stroke={page}
              strokeWidth={0.4}
            />
          );
        }),
      )}
    </svg>
  );
}

function Checks({ checks }: { checks: ChartCheck[] }) {
  return (
    <ul className="spring-findings">
      {checks.map((c) => (
        <li key={c.id}>
          <span className="spring-meta" aria-label={c.status}>
            {MARK[c.status]}
          </span>
          <span>
            {c.title}. <span className="spring-meta">{c.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Series, the series as each kind of color blindness sees them, both ramps, and the checks. */
export function ChartOutput({
  system,
  mode,
  format,
}: {
  system: System;
  mode: Mode;
  format: ColorFormat;
}) {
  const [copied, copy, said] = useCopy();
  const c = system.charts;
  const page = system.scales.neutral[mode][0]!.hex;
  const series = c.categorical[mode];
  const shown = series.slice(0, c.count);
  const filterId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const common = { page, format, copy, copied };
  return (
    <>
      <svg width="0" height="0" className="absolute" aria-hidden>
        {Object.entries(CVD_FILTER).map(([k, m]) => (
          <filter key={k} id={`${filterId}-${k}`} colorInterpolationFilters="linearRGB">
            <feColorMatrix type="matrix" values={m} />
          </filter>
        ))}
      </svg>
      <div className="spring-scales">
        <Strip
          name="series"
          colors={series}
          shown={c.count}
          token={(i) => `chart-${i + 1}`}
          {...common}
        />
        {VISIONS.filter((v) => v !== "normal").map((v) => {
          const near = c.closest[mode][v];
          return (
            <div key={v} className="spring-scale" aria-hidden>
              <span className="spring-strip">
                <span className="spring-strip__name" title={VISION_LABEL[v]}>
                  {v}
                </span>
                <span className="spring-meta">
                  {near.a + 1}≈{near.b + 1} ΔE {near.d.toFixed(2)}
                </span>
              </span>
              <span
                className="spring-scale__steps"
                style={{
                  gridTemplateColumns: `repeat(${shown.length}, 1fr)`,
                  filter: `url(#${filterId}-${v})`,
                }}
              >
                {shown.map((hex) => (
                  <span key={hex} style={{ backgroundColor: hex }} />
                ))}
              </span>
            </div>
          );
        })}
        <Strip
          name="sequential"
          colors={c.sequential[mode]}
          token={(i) => `chart-seq-${i + 1}`}
          {...common}
        />
        <Strip
          name="diverging"
          colors={c.diverging[mode]}
          token={(i) => `chart-div-${i + 1}`}
          {...common}
        />
      </div>
      <Sample colors={shown} page={page} />
      <p className="spring-meta">
        Series 1–{c.count} are graded; all {CHART_MAX} export as --chart-1…{CHART_MAX}, in this
        order. ΔE is OKLab distance between the closest pair.
      </p>
      <output className="sr-only">{said}</output>
      <Checks checks={c.checks[mode]} />
    </>
  );
}

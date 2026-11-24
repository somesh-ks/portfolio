"use client";

import { useId, useRef, useState, type PointerEvent } from "react";
import {
  bezierAt,
  DEFAULT_CURVE,
  ENDS,
  parseBezier,
  type Curve,
  type Swatch,
} from "@/lib/spring/color";
import { Select } from "@/components/ui/Select";

type Bezier = Curve["bezier"];
const PRESETS: { value: string; label: string; bezier: Bezier }[] = [
  { value: "balanced", label: "Balanced", bezier: DEFAULT_CURVE.bezier },
  { value: "even", label: "Even", bezier: [0, 0, 1, 1] },
  { value: "airy", label: "Airy (more light steps)", bezier: [0.6, 0, 0.95, 0.5] },
  { value: "deep", label: "Deep (more dark steps)", bezier: [0.2, 0.2, 0.6, 0.7] },
];
const same = (a: Bezier, b: Bezier) => a.every((v, i) => Math.abs(v - b[i]!) < 0.005);
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The palette's lightness curve, drawn like an easing curve: across is the step,
 * up is how far toward the text end it has gone. The dots are the real steps.
 * Drag the two handles, pick a preset, or type the four values.
 */
export function CurveEditor({
  curve,
  steps,
  onChange,
}: {
  curve: Curve;
  /** The accent scale in light mode, drawn on the curve. */
  steps: Swatch[];
  onChange: (c: Curve) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<0 | 1 | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const id = useId();
  const b = curve.bezier;
  const [from, to] = ENDS.light;
  const preset = PRESETS.find((p) => same(p.bezier, b))?.value ?? "custom";
  const path = Array.from({ length: 41 }, (_, i) => {
    const x = i / 40;
    return `${i ? "L" : "M"}${x * 100} ${100 - bezierAt(b, x) * 100}`;
  }).join(" ");
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (drag.current === null) return;
    const r = svg.current!.getBoundingClientRect();
    const x = r2(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    const y = r2(Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height)));
    const next = [...b] as Bezier;
    next[drag.current * 2] = x;
    next[drag.current * 2 + 1] = y;
    onChange({ ...curve, bezier: next });
  };
  const apply = () => {
    const next = draft === null ? null : parseBezier(draft);
    if (next) onChange({ ...curve, bezier: next });
    setDraft(null);
  };
  const handle = (i: 0 | 1, x: number, y: number, ax: number, ay: number) => (
    <g key={i}>
      <line x1={ax} y1={ay} x2={x * 100} y2={100 - y * 100} className="spring-curve__arm" />
      <circle
        cx={x * 100}
        cy={100 - y * 100}
        r={4}
        className="spring-curve__handle"
        onPointerDown={(e) => {
          e.preventDefault();
          drag.current = i;
          svg.current!.setPointerCapture(e.pointerId);
        }}
      />
    </g>
  );

  return (
    <div className="field spring-curve">
      <Select
        label="Lightness curve"
        value={preset}
        options={[
          ...PRESETS.map(({ value, label }) => ({ value, label })),
          ...(preset === "custom" ? [{ value: "custom", label: "Custom" }] : []),
        ]}
        onChange={(v) => {
          const p = PRESETS.find((x) => x.value === v);
          if (p) onChange({ ...curve, bezier: p.bezier });
        }}
      />
      <svg
        ref={svg}
        viewBox="-6 -6 112 112"
        className="spring-curve__plot"
        aria-hidden
        onPointerMove={move}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <rect x={0} y={0} width={100} height={100} className="spring-curve__frame" />
        <path d={path} className="spring-curve__line" />
        {handle(0, b[0], b[1], 0, 100)}
        {handle(1, b[2], b[3], 100, 0)}
        {steps.map((s, i) => (
          <circle
            key={s.step}
            cx={(i / 11) * 100}
            // Real lightness, so the dots show where the brand bends the curve.
            cy={100 - ((from - s.oklch.l) / (from - to)) * 100}
            r={3}
            fill={s.hex}
            className="spring-curve__dot"
          />
        ))}
      </svg>
      <span className="field__input spring-curve__values">
        <label className="field__unit" htmlFor={`${id}-bezier`}>
          cubic-bezier
        </label>
        <input
          id={`${id}-bezier`}
          value={draft ?? b.join(", ")}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={apply}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply();
            if (e.key === "Escape") setDraft(null);
          }}
          aria-invalid={draft !== null && !parseBezier(draft)}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
        />
      </span>
    </div>
  );
}

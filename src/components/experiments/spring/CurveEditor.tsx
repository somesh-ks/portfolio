"use client";

import { useId, useRef, useState, type PointerEvent } from "react";
import {
  bezierAt,
  DEFAULT_CURVE,
  ENDS,
  parseBezier,
  type Curve,
  type Mode,
  type Swatch,
} from "@/lib/spring/color";
import { Select } from "@/components/ui/Select";

type Bezier = Curve["bezier"];
/**
 * Named for the curve's shape, as in CSS, so the name matches the plot. The
 * hint says what the shape does to the palette.
 */
const PRESETS: { value: string; label: string; hint: string; bezier: Bezier }[] = [
  { value: "ease-in", label: "Ease in", hint: "quiet borders", bezier: DEFAULT_CURVE.bezier },
  {
    value: "ease-in-out",
    label: "Ease in-out",
    hint: "strong borders",
    bezier: [0.42, 0, 0.58, 1],
  },
  { value: "linear", label: "Linear", hint: "even steps", bezier: [0, 0, 1, 1] },
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
  mode,
  strips,
  onChange,
}: {
  curve: Curve;
  mode: Mode;
  /** Every strip in the current mode, primary first; all of them follow this curve. */
  strips: Swatch[][];
  onChange: (c: Curve) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<0 | 1 | null>(null);
  const [active, setActive] = useState<0 | 1 | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const id = useId();
  const b = curve.bezier;
  const [from, to] = ENDS[mode];
  const preset = PRESETS.find((p) => same(p.bezier, b))?.value ?? "custom";
  const path = Array.from({ length: 41 }, (_, i) => {
    const x = i / 40;
    return `${i ? "L" : "M"}${x * 100} ${100 - bezierAt(b, x) * 100}`;
  }).join(" ");
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (drag.current === null) return;
    // Map through the SVG's own transform: the viewBox pads the plot by 8 units
    // on each side, so scaling by the element's box drifts off the cursor.
    const el = svg.current!;
    const m = el.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const x = r2(Math.min(1, Math.max(0, p.x / 100)));
    const y = r2(Math.min(1, Math.max(0, 1 - p.y / 100)));
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
  const end = () => {
    drag.current = null;
    setActive(null);
  };
  const handle = (i: 0 | 1, x: number, y: number, ax: number, ay: number) => (
    <g key={i} className="spring-curve__grip" data-active={active === i || undefined}>
      <line x1={ax} y1={ay} x2={x * 100} y2={100 - y * 100} className="spring-curve__arm" />
      {/* A wide invisible ring takes the pointer, so the small knob is easy to grab. */}
      <circle
        cx={x * 100}
        cy={100 - y * 100}
        r={10}
        className="spring-curve__hit"
        onPointerDown={(e) => {
          e.preventDefault();
          drag.current = i;
          setActive(i);
          svg.current!.setPointerCapture(e.pointerId);
        }}
      />
      <circle cx={x * 100} cy={100 - y * 100} r={4} className="spring-curve__handle" />
    </g>
  );
  const dots = (steps: Swatch[], k: number) =>
    steps.map((sw, i) => (
      <circle
        key={`${k}-${sw.step}`}
        cx={(i / 11) * 100}
        // Real lightness, so the dots show where each color bends the curve.
        cy={100 - ((from - sw.oklch.l) / (from - to)) * 100}
        r={k ? 1.6 : 3}
        fill={sw.hex}
        className={k ? "spring-curve__dot spring-curve__dot--other" : "spring-curve__dot"}
      />
    ));

  return (
    <div className="field spring-curve">
      <Select
        label="Curve"
        value={preset}
        options={[
          ...PRESETS.map(({ value, label, hint }) => ({ value, label, hint })),
          ...(preset === "custom" ? [{ value: "custom", label: "Custom" }] : []),
        ]}
        onChange={(v) => {
          const p = PRESETS.find((x) => x.value === v);
          if (p) onChange({ ...curve, bezier: p.bezier });
        }}
      />
      <svg
        ref={svg}
        viewBox="-8 -8 116 116"
        className="spring-curve__plot"
        aria-hidden
        data-dragging={active !== null || undefined}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <rect x={0} y={0} width={100} height={100} className="spring-curve__frame" />
        <path d={path} className="spring-curve__line" />
        {strips.slice(1).map((st, k) => dots(st, k + 1))}
        {dots(strips[0]!, 0)}
        {handle(0, b[0], b[1], 0, 100)}
        {handle(1, b[2], b[3], 100, 0)}
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

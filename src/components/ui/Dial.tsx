"use client";

/**
 * A compact slider row: the whole row is the track. Drag or click anywhere to
 * set it, or click the value to type one. A native range input underneath
 * gives keyboards and screen readers the usual slider; the value field takes
 * Enter to commit, Escape to revert, and Up/Down (Shift for ×10) to step.
 * Double-click the row to reset when `reset` is given.
 */
import { useState, type CSSProperties, type KeyboardEvent } from "react";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function Dial({
  label,
  value,
  min,
  max,
  step,
  onChange,
  show,
  scale = 1,
  reset,
  onCommit,
  flash,
  className,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** The value as read at rest, e.g. "20%" or "+4°". */
  show: string;
  /** Typed numbers are divided by this: 100 lets people type 20 for 0.2. */
  scale?: number;
  /** The value a double-click restores. */
  reset?: number;
  /** Fires when a drag, key press or typed edit ends, for work too noisy for every tick. */
  onCommit?: () => void;
  /** Pulses the row once, for a value that changed without the visitor moving it. Change the key to replay. */
  flash?: boolean;
  /** Extra class on the row, e.g. to paint a custom track. */
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const snap = (v: number) => {
    const s = Math.round((clamp(v, min, max) - min) / step) * step + min;
    return Number(s.toFixed(6));
  };
  const typed = (text: string) => {
    const n = Number.parseFloat(text.replace(/[^\d.+-]/g, ""));
    return Number.isFinite(n) ? snap(n / scale) : null;
  };
  const commit = () => {
    const v = draft === null ? null : typed(draft);
    if (v !== null && v !== value) {
      onChange(v);
      onCommit?.();
    }
    setDraft(null);
  };
  const nudge = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") return commit();
    if (e.key === "Escape") return setDraft(null);
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const by = (e.key === "ArrowUp" ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
    const next = snap((draft === null ? value : (typed(draft) ?? value)) + by);
    onChange(next);
    setDraft(String(Number((next * scale).toFixed(4))));
  };
  const p = ((clamp(value, min, max) - min) / (max - min)) * 100;

  return (
    <div
      className={className ? `dial ${className}` : "dial"}
      data-flash={flash || undefined}
      style={{ "--p": `${p}%` } as CSSProperties}
    >
      <input
        type="range"
        className="dial__range"
        aria-label={label}
        aria-valuetext={show}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={(e) => {
          // Only keys that move the slider end an edit; Tab onto it shouldn't.
          if (/^(Arrow|Page|Home|End)/.test(e.key)) onCommit?.();
        }}
        onDoubleClick={reset === undefined ? undefined : () => onChange(reset)}
      />
      <span className="dial__label" aria-hidden>
        {label}
      </span>
      <input
        className="dial__value"
        aria-label={`${label}, type a value`}
        value={draft ?? show}
        onFocus={(e) => {
          setDraft(String(Number((value * scale).toFixed(4))));
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={nudge}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        size={Math.max(4, show.length)}
      />
    </div>
  );
}

"use client";

/**
 * A compact slider row: the whole row is the track. Drag anywhere to scrub from
 * the current value (no jump on press; Shift for fine steps), click without
 * dragging to set it to that point, or click the value to type one. A native range input underneath
 * gives keyboards and screen readers the usual slider; the value field takes
 * Enter to commit, Escape to revert, and Up/Down (Shift for ×10) to step.
 * Double-click the row to reset when `reset` is given.
 */
import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

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
  const [pressed, setPressed] = useState(false);
  const range = useRef<HTMLInputElement>(null);
  /** The live drag: last pointer x, the unsnapped value so far, and whether it moved past a click. */
  const drag = useRef<{
    id: number;
    x: number;
    v: number;
    start: number;
    moved: boolean;
  } | null>(null);
  /** A press that ended without a drag: the click that follows sets the point. */
  const tapped = useRef(false);
  const snap = (v: number) => {
    const s = Math.round((clamp(v, min, max) - min) / step) * step + min;
    return Number(s.toFixed(6));
  };
  const typed = (text: string) => {
    const n = Number.parseFloat(text.replace(/[^\d.+-]/g, ""));
    return Number.isFinite(n) ? snap(n / scale) : null;
  };
  const raw = (v: number) => String(Number((v * scale).toFixed(4)));
  const commit = () => {
    const v = draft === null ? null : typed(draft);
    if (v !== null && v !== value) {
      onChange(v);
      onCommit?.();
    }
    setDraft(null);
    return v ?? value;
  };
  const nudge = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Focus stays in the field, so keep the bare number selected: the next
      // keystroke replaces it instead of landing after the unit ("30%5").
      const field = e.currentTarget;
      setDraft(raw(commit()));
      requestAnimationFrame(() => field.select());
      return;
    }
    if (e.key === "Escape") return setDraft(null);
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const by = (e.key === "ArrowUp" ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
    const next = snap((draft === null ? value : (typed(draft) ?? value)) + by);
    onChange(next);
    setDraft(raw(next));
  };
  const p = ((clamp(value, min, max) - min) / (max - min)) * 100;
  // A number with a unit ("55.0%", "+4°"): the unit stays put while typing.
  const unit = /[^\d.\s+-]+$/.exec(show)?.[0] ?? "";

  const down = (e: PointerEvent<HTMLDivElement>) => {
    // One pointer owns a scrub; a second finger can't take it over.
    if (drag.current || e.button !== 0 || (e.target as Element).closest(".dial__value")) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setPressed(true);
    // A half-typed value commits on blur; scrub from it, not the stale prop.
    const start = draft === null ? value : (typed(draft) ?? value);
    range.current?.focus({ preventScroll: true });
    tapped.current = false;
    drag.current = { id: e.pointerId, x: e.clientX, v: start, start, moved: false };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x;
    // Touch gets a wider slop so a vertical scroll's jitter doesn't scrub.
    if (!d.moved && Math.abs(dx) < (e.pointerType === "touch" ? 8 : 3)) return;
    d.moved = true;
    d.x = e.clientX;
    d.v = clamp(
      d.v + (dx / e.currentTarget.clientWidth) * (max - min) * (e.shiftKey ? 0.1 : 1),
      min,
      max,
    );
    const next = snap(d.v);
    if (next !== value) onChange(next);
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    setPressed(false);
    if (e.type === "pointercancel") {
      // The browser took the gesture (a scroll): undo any scrub it began.
      if (d.moved) onChange(snap(d.start));
      return;
    }
    if (d.moved) onCommit?.();
    else tapped.current = true;
  };
  // Pointer events carry no click count, so click-to-set waits for the click.
  const click = (e: MouseEvent<HTMLDivElement>) => {
    if (!tapped.current) return;
    tapped.current = false;
    // The second click of a double-click resets instead of setting.
    if (reset !== undefined && e.detail > 1) return;
    const r = e.currentTarget.getBoundingClientRect();
    onChange(snap(min + ((e.clientX - r.left) / r.width) * (max - min)));
    onCommit?.();
  };

  // The hidden range inside is the keyboard and screen-reader control; the row only adds pointer input.
  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={className ? `dial ${className}` : "dial"}
      data-flash={flash || undefined}
      data-pressed={pressed || undefined}
      data-editing={draft !== null || undefined}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onClick={click}
      onDoubleClick={
        reset === undefined
          ? undefined
          : (e) => {
              if ((e.target as Element).closest(".dial__value")) return;
              onChange(reset);
              onCommit?.();
            }
      }
      style={{ "--p": `${p}%` } as CSSProperties}
    >
      <input
        ref={range}
        type="range"
        className="dial__range"
        aria-label={label}
        aria-valuetext={show}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onKeyUp={(e) => {
          // Only keys that move the slider end an edit; Tab onto it shouldn't.
          if (/^(Arrow|Page|Home|End)/.test(e.key)) onCommit?.();
        }}
      />
      <span className="dial__label" aria-hidden>
        {label}
      </span>
      <input
        className="dial__value"
        aria-label={`${label}, type a value`}
        value={draft ?? show}
        onFocus={(e) => {
          setDraft(raw(value));
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={nudge}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        size={draft === null ? Math.max(4, show.length) : Math.max(2, draft.length)}
      />
      {draft !== null && unit && (
        <span className="dial__unit" aria-hidden>
          {unit}
        </span>
      )}
    </div>
  );
}

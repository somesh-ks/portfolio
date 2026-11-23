"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { clampChroma, oklchToHex } from "@/lib/spring/colormath";
import { parseColor } from "@/lib/spring/color";

const MAX_C = 0.3;
const MIN_C = 0.02;
// Painted small and stretched by CSS: the field is smooth, so 120×40 is plenty.
const W = 120;
const H = 40;

/** Every hue across, chroma from vivid (top) to near gray (bottom), at one lightness. */
function paint(canvas: HTMLCanvasElement, l: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const c = MAX_C - (y / (H - 1)) * (MAX_C - MIN_C);
    for (let x = 0; x < W; x++) {
      const hex = oklchToHex(clampChroma({ l, c, h: (x / (W - 1)) * 360 }));
      const i = (y * W + x) * 4;
      img.data[i] = parseInt(hex.slice(1, 3), 16);
      img.data[i + 1] = parseInt(hex.slice(3, 5), 16);
      img.data[i + 2] = parseInt(hex.slice(5, 7), 16);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Brand color as hue × chroma in OKLCH, plus a hex field. Lightness is left to
 * the scale, which sets it per step. Two native range inputs sit under the field
 * for keyboards and screen readers; the knob shows their focus.
 */
export function ColorPicker({
  hue,
  chroma,
  hex,
  lightness,
  onPick,
  onHex,
}: {
  hue: number;
  chroma: number;
  /** The solid step's hex, shown in the field and swatch. */
  hex: string;
  lightness: number;
  onPick: (p: { hue: number; chroma: number }) => void;
  onHex: (hex: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const hueInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const id = useId();
  // Repaint only when lightness moves by a visible amount.
  const l = Math.round(lightness * 50) / 50;
  useEffect(() => {
    if (canvas.current) paint(canvas.current, l);
  }, [l]);

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = frame.current!.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    onPick({
      hue: Math.round(x * 360),
      chroma: Math.round((MAX_C - y * (MAX_C - MIN_C)) * 1000) / 1000,
    });
  };
  const apply = () => {
    if (draft && parseColor(draft)) onHex(draft);
    setDraft(null);
  };

  return (
    <div className="field spring-picker">
      <label className="field__label" htmlFor={`${id}-hex`}>
        Brand color
      </label>
      <div
        ref={frame}
        className="spring-picker__field"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          // Keep text from selecting, and hand the arrow keys to the field.
          e.preventDefault();
          hueInput.current?.focus({ preventScroll: true });
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e);
        }}
      >
        <canvas ref={canvas} width={W} height={H} aria-hidden />
        <span
          className="spring-picker__knob"
          style={{
            left: `${(hue / 360) * 100}%`,
            top: `${((MAX_C - chroma) / (MAX_C - MIN_C)) * 100}%`,
            background: hex,
          }}
          aria-hidden
        />
        <input
          ref={hueInput}
          type="range"
          className="spring-picker__input"
          aria-label="Brand hue"
          aria-valuetext={`${Math.round(hue)} degrees`}
          min={0}
          max={360}
          step={1}
          value={hue}
          onChange={(e) => onPick({ hue: Number(e.target.value), chroma })}
        />
        <input
          type="range"
          className="spring-picker__input"
          aria-label="Brand chroma"
          aria-valuetext={chroma.toFixed(2)}
          min={MIN_C}
          max={MAX_C}
          step={0.005}
          value={chroma}
          onChange={(e) => onPick({ hue, chroma: Number(e.target.value) })}
        />
      </div>
      <span className="field__input">
        <span className="spring-swatch" style={{ background: hex }} aria-hidden />
        <input
          id={`${id}-hex`}
          value={draft ?? hex}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={apply}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply();
            if (e.key === "Escape") setDraft(null);
          }}
          autoComplete="off"
          spellCheck={false}
        />
      </span>
    </div>
  );
}

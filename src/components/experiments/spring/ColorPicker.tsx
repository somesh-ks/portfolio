"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import {
  clampChroma,
  formatColor,
  hexToHsl,
  hslToHex,
  oklchToHex,
  type ColorFormat,
} from "@/lib/spring/colormath";
import { parseColor } from "@/lib/spring/color";
import { Select } from "@/components/ui/Select";

const MAX_C = 0.3;
const MIN_C = 0.02;
// Painted small and stretched by CSS: the field is smooth, so 120×40 is plenty.
const W = 120;
const H = 40;
const FORMAT_LABEL: Record<ColorFormat, string> = { oklch: "OKLCH", hsl: "HSL", hex: "Hex" };

/**
 * Every hue across. Down the field: OKLCH chroma (vivid to gray) at the brand's
 * lightness, or HSL saturation at its HSL lightness. OKLCH keeps lightness even
 * across hues; HSL is the spectrum most pickers show.
 */
function paint(canvas: HTMLCanvasElement, space: "oklch" | "hsl", l: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const v = 1 - y / (H - 1);
    for (let x = 0; x < W; x++) {
      const h = (x / (W - 1)) * 360;
      const hex =
        space === "oklch"
          ? oklchToHex(clampChroma({ l, c: MIN_C + v * (MAX_C - MIN_C), h }))
          : hslToHex(h, v, l);
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
 * The brand color. OKLCH moves hue and chroma and leaves lightness to the
 * scale; HSL and Hex move hue and saturation, the field people know from other
 * pickers. Two native range inputs sit under the field for keyboards and screen
 * readers; the knob shows their focus.
 */
export function ColorPicker({
  hue,
  chroma,
  hex,
  lightness,
  format,
  setFormat,
  onPick,
  onHex,
}: {
  hue: number;
  chroma: number;
  /** The brand step's hex, shown in the field and swatch. */
  hex: string;
  lightness: number;
  format: ColorFormat;
  setFormat: (f: ColorFormat) => void;
  onPick: (p: { hue: number; chroma: number }) => void;
  onHex: (hex: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const hueInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const id = useId();
  const space = format === "oklch" ? "oklch" : "hsl";
  const [hh, hs, hl] = hexToHsl(hex);
  // Repaint only when lightness moves by a visible amount.
  const l = Math.round((space === "oklch" ? lightness : hl) * 50) / 50;
  useEffect(() => {
    if (canvas.current) paint(canvas.current, space, l);
  }, [space, l]);

  // Knob position and the two axes, in the field's space.
  const x = space === "oklch" ? hue : hh;
  const y = space === "oklch" ? (chroma - MIN_C) / (MAX_C - MIN_C) : hs;
  const set = (h: number, v: number) => {
    if (space === "oklch")
      onPick({
        hue: Math.round(h),
        chroma: Math.round((MIN_C + v * (MAX_C - MIN_C)) * 1000) / 1000,
      });
    else onHex(hslToHex(h, v, hl));
  };
  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = frame.current!.getBoundingClientRect();
    set(
      Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * 360,
      1 - Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    );
  };
  const apply = () => {
    if (draft && parseColor(draft)) onHex(draft);
    setDraft(null);
  };
  const second = space === "oklch" ? "chroma" : "saturation";

  return (
    <div className="field spring-picker">
      <label className="field__label" htmlFor={`${id}-hex`}>
        Color
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
          style={{ left: `${(x / 360) * 100}%`, top: `${(1 - y) * 100}%`, background: hex }}
          aria-hidden
        />
        <input
          ref={hueInput}
          type="range"
          className="spring-picker__input"
          aria-label="Brand hue"
          aria-valuetext={`${Math.round(x)} degrees`}
          min={0}
          max={360}
          step={1}
          value={Math.round(x)}
          onChange={(e) => set(Number(e.target.value), y)}
        />
        <input
          type="range"
          className="spring-picker__input"
          aria-label={`Brand ${second}`}
          aria-valuetext={`${Math.round(y * 100)}%`}
          min={0}
          max={1}
          step={0.01}
          value={y}
          onChange={(e) => set(x, Number(e.target.value))}
        />
      </div>
      <span className="field__input">
        <span className="spring-picker__format">
          <Select
            label="Color format"
            hideLabel
            value={format}
            options={(["oklch", "hsl", "hex"] as const).map((f) => ({
              value: f,
              label: FORMAT_LABEL[f],
            }))}
            onChange={setFormat}
          />
        </span>
        <span className="spring-picker__value">
          <span className="spring-swatch" style={{ background: hex }} aria-hidden />
          <input
            id={`${id}-hex`}
            value={draft ?? formatColor(hex, format)}
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
      </span>
    </div>
  );
}

"use client";

/**
 * Drag to compare two states. A visually hidden native range input carries
 * keyboard and screen reader support. Horizontal drags scrub; vertical drags
 * still scroll the page on touch (touch-action: pan-y).
 */
import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useSound } from "@/components/providers/SoundProvider";
import { AgenticCard } from "./AgenticCard";
import { GatedImage } from "./Figure";
import { StickerSheetDraft } from "./StickerScenes";

type Variant = "stickers" | "agentic-ds";

const SCENES: Record<
  Variant,
  { before: ReactNode; after: ReactNode; beforeLabel: string; afterLabel: string; label: string }
> = {
  stickers: {
    before: <StickerSheetDraft clean={false} />,
    after: <StickerSheetDraft clean />,
    beforeLabel: "Hand-drawn frames",
    afterLabel: "Rect model + QA",
    label: "Sticker frames before and after the rect model and cell QA",
  },
  "agentic-ds": {
    before: <AgenticCard mode="naive" />,
    after: <AgenticCard mode="gated" />,
    beforeLabel: "From a screenshot",
    afterLabel: "Through the gate",
    label: "The same card built by a naive agent and by a gated agent",
  },
};

interface ScrubberProps {
  variant?: Variant;
  /** Media variant (used inside locked case studies). Paths are already gated URLs. */
  beforeSrc?: string;
  afterSrc?: string;
  beforeAlt?: string;
  afterAlt?: string;
}

export function BeforeAfterScrubber({
  variant,
  beforeSrc,
  afterSrc,
  beforeAlt = "Before",
  afterAlt = "After",
}: ScrubberProps) {
  const [position, setPosition] = useState(50);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastTick = useRef(50);
  const { play } = useSound();

  const scene = variant ? SCENES[variant] : null;
  const before =
    scene?.before ??
    (beforeSrc ? <GatedImage src={beforeSrc} alt={beforeAlt} className="scrubber__media" /> : null);
  const after =
    scene?.after ??
    (afterSrc ? <GatedImage src={afterSrc} alt={afterAlt} className="scrubber__media" /> : null);

  const update = useCallback(
    (next: number) => {
      const clamped = Math.min(100, Math.max(0, next));
      setPosition(clamped);
      // A soft tick every 10%, only if sound is on.
      if (Math.abs(clamped - lastTick.current) >= 10) {
        lastTick.current = clamped;
        play("tick");
      }
    },
    [play],
  );

  const fromPointer = (event: PointerEvent) => {
    const rect = frame.current?.getBoundingClientRect();
    if (rect) update(((event.clientX - rect.left) / rect.width) * 100);
  };

  return (
    <figure className="toy scrubber">
      <div
        ref={frame}
        className="scrubber__frame"
        style={{ "--position": `${position}%` } as CSSProperties}
        onPointerDown={(event) => {
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          fromPointer(event);
        }}
        onPointerMove={(event) => dragging.current && fromPointer(event)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <div className="scrubber__layer" aria-hidden={position >= 99}>
          {before}
        </div>
        <div className="scrubber__layer scrubber__layer--after" aria-hidden={position <= 1}>
          {after}
        </div>
        <span className="scrubber__tag scrubber__tag--before">
          {scene?.beforeLabel ?? "Before"}
        </span>
        <span className="scrubber__tag scrubber__tag--after">{scene?.afterLabel ?? "After"}</span>
        <span className="scrubber__handle" aria-hidden="true">
          <span className="scrubber__knob" />
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(position)}
          onChange={(event) => update(Number(event.target.value))}
          aria-label={scene ? `Compare: ${scene.label}` : "Compare before and after"}
          aria-valuetext={`${Math.round(position)}% before, ${Math.round(100 - position)}% after`}
          className="scrubber__input"
        />
      </div>
      <figcaption className="toy__caption">
        Drag the handle, or focus it and use the arrow keys.
      </figcaption>
    </figure>
  );
}

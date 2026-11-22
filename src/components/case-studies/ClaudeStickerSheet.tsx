"use client";

/**
 * The sticker set, live: each sticker is a <claude-mascot> playing one loop
 * when pressed. Format badges show where each one ships.
 */
import { useRef, useState } from "react";
import { MascotFallback } from "@/components/experiments/MascotFallback";
import { useMascotElement } from "@/components/experiments/useMascotElement";
import { useSound } from "@/components/providers/SoundProvider";
import type { ClaudeMascotElement } from "@/lib/mascot-element";
import type { Animation } from "@/lib/mascot";

const STICKERS: { name: string; animation: Animation; formats: string[] }[] = [
  { name: "Hello", animation: "wave", formats: ["SVG", "GIF", "WC"] },
  { name: "Ship it", animation: "jump", formats: ["SVG", "Lottie", "GIF"] },
  { name: "Hmm", animation: "look", formats: ["SVG", "Lottie", "WC"] },
  { name: "Sleepy", animation: "blink", formats: ["SVG", "GIF"] },
  { name: "Waiting", animation: "idle", formats: ["Lottie", "WC"] },
  { name: "Yay", animation: "jump", formats: ["SVG", "Lottie", "GIF", "WC"] },
];

export function ClaudeStickerSheet() {
  useMascotElement();
  const refs = useRef<(ClaudeMascotElement | null)[]>([]);
  const [last, setLast] = useState<string | null>(null);
  const { play } = useSound();
  return (
    <figure className="toy sticker-sheet">
      <ul className="sticker-sheet__grid">
        {STICKERS.map((sticker, index) => (
          <li key={sticker.name}>
            <button
              type="button"
              className="sticker pressable"
              onClick={() => {
                refs.current[index]?.play(sticker.animation);
                play("pop");
                setLast(sticker.name);
              }}
            >
              <claude-mascot
                ref={(node: ClaudeMascotElement | null) => {
                  refs.current[index] = node;
                }}
                animation="idle"
                paused
              >
                <MascotFallback />
              </claude-mascot>
              <span className="sticker__name">{sticker.name}</span>
              <span className="sticker__formats">
                {sticker.formats.map((format) => (
                  <span key={format} className="sticker__format">
                    {format}
                  </span>
                ))}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <figcaption className="toy__caption" aria-live="polite">
        {last
          ? `${last}: played from the same rect model as the exports.`
          : "Tap a sticker to play it."}
      </figcaption>
    </figure>
  );
}

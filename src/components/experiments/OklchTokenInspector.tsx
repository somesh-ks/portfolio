"use client";

import { Check, Copy, X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useSound } from "@/components/providers/SoundProvider";
import { buildRamp, contrastRatio, formatOklch, type Oklch } from "@/lib/oklch";

const AA_TEXT = 4.5;
const AA_UI = 3;

function Verdict({ ratio, min }: { ratio: number; min: number }) {
  const pass = ratio >= min;
  return (
    <span className={`verdict ${pass ? "verdict--pass" : "verdict--fail"}`}>
      {pass ? (
        <Check aria-hidden="true" size={12} strokeWidth={2.5} />
      ) : (
        <X aria-hidden="true" size={12} strokeWidth={2.5} />
      )}
      <span className="tabular">{ratio.toFixed(2)}</span>
      <span>{pass ? "passes" : "fails"}</span>
    </span>
  );
}

export function OklchTokenInspector() {
  const ids = useId();
  const { play } = useSound();
  const [hue, setHue] = useState(40);
  const [chroma, setChroma] = useState(0.15);
  const [fgIndex, setFgIndex] = useState(8);
  const [bgIndex, setBgIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const ramp = useMemo(() => buildRamp(hue, chroma), [hue, chroma]);
  const fg = ramp[fgIndex]?.color as Oklch;
  const bg = ramp[bgIndex]?.color as Oklch;
  const ratio = contrastRatio(fg, bg);

  const dtcg = JSON.stringify(
    {
      color: {
        $type: "color",
        brand: Object.fromEntries(
          ramp.map(({ step, color }) => [
            step,
            {
              $value: {
                colorSpace: "oklch",
                components: [+color.l.toFixed(3), +color.c.toFixed(3), hue],
              },
            },
          ]),
        ),
      },
    },
    null,
    2,
  );

  return (
    <div className="toy inspector">
      <div className="inspector__controls">
        <label className="field" htmlFor={`${ids}-hue`}>
          <span className="field__label">
            Hue <span className="tabular field__value">{hue}°</span>
          </span>
          <input
            id={`${ids}-hue`}
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={(event) => setHue(Number(event.target.value))}
            className="range range--hue"
          />
        </label>
        <label className="field" htmlFor={`${ids}-chroma`}>
          <span className="field__label">
            Chroma <span className="tabular field__value">{chroma.toFixed(3)}</span>
          </span>
          <input
            id={`${ids}-chroma`}
            type="range"
            min={0}
            max={0.3}
            step={0.005}
            value={chroma}
            onChange={(event) => setChroma(Number(event.target.value))}
            className="range"
          />
        </label>
      </div>

      <ol className="ramp" aria-label="Generated ramp. Pick a text step and a surface step.">
        {ramp.map(({ step, color }, index) => {
          const onWhite = contrastRatio(color, { l: 1, c: 0, h: 0 });
          return (
            <li key={step} className="ramp__step">
              <span className="ramp__swatch" style={{ background: formatOklch(color) }} />
              <span className="ramp__label tabular">{step}</span>
              <span className="ramp__ratio tabular" title="Contrast against white">
                {onWhite.toFixed(1)}
              </span>
              <span className="ramp__pick">
                <button
                  type="button"
                  aria-pressed={index === fgIndex}
                  aria-label={`Use ${step} as text`}
                  onClick={() => {
                    setFgIndex(index);
                    play("tick");
                  }}
                  className="ramp__button pressable"
                >
                  Aa
                </button>
                <button
                  type="button"
                  aria-pressed={index === bgIndex}
                  aria-label={`Use ${step} as surface`}
                  onClick={() => {
                    setBgIndex(index);
                    play("tick");
                  }}
                  className="ramp__button ramp__button--surface pressable"
                >
                  <span aria-hidden="true" />
                </button>
              </span>
            </li>
          );
        })}
      </ol>

      <div
        className="inspector__preview"
        style={{ background: formatOklch(bg), color: formatOklch(fg) }}
      >
        <p className="inspector__sample">
          Step {ramp[fgIndex]?.step} text on step {ramp[bgIndex]?.step}
        </p>
        <p className="inspector__sample-small">
          Body copy has to clear 4.5:1. Icons and borders need 3:1.
        </p>
      </div>

      <dl className="inspector__results" aria-live="polite">
        <div>
          <dt>Body text (4.5:1)</dt>
          <dd>
            <Verdict ratio={ratio} min={AA_TEXT} />
          </dd>
        </div>
        <div>
          <dt>Large text and UI (3:1)</dt>
          <dd>
            <Verdict ratio={ratio} min={AA_UI} />
          </dd>
        </div>
      </dl>

      <div className="toy__actions">
        <button
          type="button"
          className="button pressable"
          data-sound="none"
          onClick={async () => {
            await navigator.clipboard.writeText(dtcg);
            setCopied(true);
            play("pop");
            window.setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? (
            <Check aria-hidden="true" size={15} strokeWidth={2} />
          ) : (
            <Copy aria-hidden="true" size={15} strokeWidth={1.75} />
          )}
          <span aria-live="polite">{copied ? "Copied" : "Copy as DTCG tokens"}</span>
        </button>
      </div>
    </div>
  );
}

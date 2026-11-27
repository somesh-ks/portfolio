"use client";

import { useState, type ReactNode } from "react";
import { useSound } from "@/components/providers/SoundProvider";

interface PipelineStage {
  id: string;
  name: string;
  sub: string;
  detail: string;
  metric: string;
  icon: ReactNode;
}

const FIRST_STAGE: PipelineStage = {
  id: "source",
  name: "Source PDF",
  sub: "Parse beats and dialogue",
  detail: "Decompose prose sentences into physical beats and rank key turning points.",
  metric: "Cut rate: 140 prose -> 60 comic pages",
  icon: (
    <svg className="comic-flow__icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="0.5"
        y="0.5"
        width="23"
        height="23"
        fill="var(--surface-sunken)"
        stroke="var(--border-strong)"
        strokeWidth="1"
      />
      <g
        transform="translate(4 4) scale(0.67)"
        fill="none"
        stroke="var(--text-primary)"
        strokeWidth="2"
      >
        <path d="M4 5h6a2 2 0 0 1 2 2v12a1 1 0 0 0-1-1H4V5Z" />
        <path d="M20 5h-6a2 2 0 0 0-2 2v12a1 1 0 0 1 1-1h7V5Z" />
      </g>
    </svg>
  ),
};

const STAGES: readonly [PipelineStage, ...PipelineStage[]] = [
  FIRST_STAGE,
  {
    id: "claude",
    name: "Claude",
    sub: "sk-comics manifest and lock",
    detail: "Lock period medium, 5 pigments, turnaround sheets, and pages_manifest.json.",
    metric: "Lock: style anchor + turnaround cast",
    icon: (
      <svg
        className="comic-flow__icon comic-flow__icon--brand"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect
          x="0.5"
          y="0.5"
          width="23"
          height="23"
          fill="#191919"
          stroke="var(--border-strong)"
          strokeWidth="1"
        />
        <g transform="translate(3 3) scale(0.75)" fill="#D97757">
          <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
        </g>
      </svg>
    ),
  },
  {
    id: "jev",
    name: "TypeSafe Jev",
    sub: "1s beat and typo gates",
    detail: "Verify beat coverage, source fidelity, moderation, and transcribed balloons.",
    metric: "Latency: 1s per 40-judge batch",
    icon: (
      <svg
        className="comic-flow__icon comic-flow__icon--brand"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect
          x="0.5"
          y="0.5"
          width="23"
          height="23"
          fill="#E555B8"
          stroke="var(--border-strong)"
          strokeWidth="1"
        />
        <g transform="translate(5.6 3.2) scale(0.74)" fill="#141414">
          <path d="M 12.756 2.928 L 12.756 7.067 L 16.486 9.487 L 16.487 18.652 L 8.244 24 L 3.732 21.073 L 3.732 16.82 L 0 14.399 L 0 5.35 L 0.355 5.118 L 8.244 0 Z M 5.94 20.65 L 8.242 22.144 L 14.275 18.227 L 11.975 16.735 Z M 9.022 10.332 L 9.022 14.4 L 5.29 16.822 L 5.29 19.216 L 11.197 15.383 L 11.197 8.921 Z M 12.756 15.384 L 14.928 16.794 L 14.928 10.332 L 12.756 8.922 Z M 2.21 13.976 L 4.511 15.47 L 6.812 13.976 L 4.512 12.485 Z M 1.559 6.193 L 1.559 12.544 L 3.731 11.134 L 3.731 7.066 L 7.464 4.643 L 7.464 2.36 L 1.56 6.193 Z M 5.291 11.132 L 7.463 12.542 L 7.463 10.332 L 5.292 8.921 L 5.292 11.132 Z M 5.94 7.487 L 8.244 8.981 L 10.544 7.488 L 8.244 5.994 Z M 9.024 4.643 L 11.196 6.054 L 11.196 3.774 L 9.024 2.359 Z" />
        </g>
      </svg>
    ),
  },
  {
    id: "flora",
    name: "Flora MCP",
    sub: "20-page concurrent waves",
    detail: "Condition every page against the style anchor and cast sheets in waves of 20.",
    metric: "Speedup: 6.4x vs sequential runs",
    icon: (
      <svg
        className="comic-flow__icon comic-flow__icon--brand"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect
          x="0.5"
          y="0.5"
          width="23"
          height="23"
          fill="var(--text-primary)"
          stroke="var(--border-strong)"
          strokeWidth="1"
        />
        <g transform="translate(5.2 5.2) scale(0.56)" fill="var(--surface-canvas)">
          <path d="M 0 0 L 5.759 0 C 8.94 0 11.519 2.579 11.519 5.759 C 11.519 8.94 8.94 11.519 5.759 11.519 C 2.579 11.519 0 8.94 0 5.759 Z" />
          <path
            d="M 0 5.759 C 0 2.579 2.579 0 5.759 0 C 8.94 0 11.519 2.579 11.519 5.759 L 11.519 11.519 L 5.759 11.519 C 2.579 11.519 0 8.94 0 5.759 Z"
            transform="translate(12.481 12.481)"
          />
          <path
            d="M 0 5.759 C 0 2.579 2.579 0 5.759 0 C 8.94 0 11.519 2.579 11.519 5.759 C 11.519 8.94 8.94 11.519 5.759 11.519 L 0 11.519 Z"
            transform="translate(0 12.481)"
          />
          <path
            d="M 0 5.759 C 0 2.579 2.579 0 5.759 0 L 11.519 0 L 11.519 5.759 C 11.519 8.94 8.94 11.519 5.759 11.519 C 2.579 11.519 0 8.94 0 5.759 Z"
            transform="translate(12.481 0)"
          />
        </g>
      </svg>
    ),
  },
  {
    id: "bound",
    name: "Bound PDF",
    sub: "12-up sheets and bookmarks",
    detail: "Inspect 12-up contact sheets by eye and bind with chapter bookmarks.",
    metric: "Output: bookmarked reading edition",
    icon: (
      <svg className="comic-flow__icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="0.5"
          y="0.5"
          width="23"
          height="23"
          fill="var(--surface-sunken)"
          stroke="var(--border-strong)"
          strokeWidth="1"
        />
        <g
          transform="translate(4 4) scale(0.67)"
          fill="none"
          stroke="var(--text-primary)"
          strokeWidth="2"
        >
          <rect x="4" y="3" width="16" height="18" />
          <line x1="8" y1="8" x2="16" y2="8" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="8" y1="16" x2="13" y2="16" />
        </g>
      </svg>
    ),
  },
];

function FlowConnector() {
  return (
    <div className="comic-flow__conn" aria-hidden="true">
      <svg className="comic-flow__h-wire" viewBox="0 0 32 14">
        <line x1="1" y1="7" x2="26" y2="7" className="comic-flow__pulse" />
        <polyline points="23 4 27 7 23 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <svg className="comic-flow__v-wire" viewBox="0 0 12 20">
        <line x1="6" y1="1" x2="6" y2="15" className="comic-flow__pulse" />
        <polyline points="3 12 6 16 9 12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function ComicPressFlow() {
  const [stageIdx, setStageIdx] = useState(1);
  const { play } = useSound();
  const active = STAGES[stageIdx] ?? FIRST_STAGE;

  return (
    <figure className="toy comic-flow" aria-label="Agentic comic press pipeline">
      <fieldset className="comic-flow__bus">
        <legend className="sr-only">Press pipeline stage selector</legend>
        {STAGES.map((stage, index) => (
          <div key={stage.id} className="comic-flow__slot">
            {index > 0 ? <FlowConnector /> : null}
            <button
              type="button"
              className="comic-flow__step pressable"
              aria-pressed={index === stageIdx}
              onClick={() => {
                setStageIdx(index);
                play("tick");
              }}
            >
              <span className="comic-flow__head">
                {stage.icon}
                <span>{stage.name}</span>
              </span>
              <span className="comic-flow__sub">{stage.sub}</span>
            </button>
          </div>
        ))}
      </fieldset>

      <figcaption className="comic-flow__readout" aria-live="polite">
        <span>
          {active.name}: {active.detail}
        </span>
        <span className="comic-flow__metric">{active.metric}</span>
      </figcaption>
    </figure>
  );
}

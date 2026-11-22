"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { useState } from "react";
import { Segmented } from "@/components/experiments/Segmented";
import { useSound } from "@/components/providers/SoundProvider";
import { AgenticCard } from "./AgenticCard";

const MODES = ["naive", "gated"] as const;
type Mode = (typeof MODES)[number];

const CODE: Record<Mode, { property: string; value: string; issue?: string }[]> = {
  naive: [
    { property: "background", value: "#FAFAF9", issue: "raw colour" },
    { property: "padding", value: "13px 15px", issue: "off the 4px scale" },
    { property: "border-radius", value: "7px", issue: "not a radius token" },
    { property: "gap", value: "10px", issue: "off the 4px scale" },
    { property: "color", value: "#3B82F6", issue: "raw colour, fails 4.5:1 on white" },
  ],
  gated: [
    { property: "background", value: "var(--surface-raised)" },
    { property: "padding", value: "var(--space-4) var(--space-5)" },
    { property: "border-radius", value: "var(--radius-lg)" },
    { property: "gap", value: "var(--space-3)" },
    { property: "color", value: "var(--text-accent)" },
  ],
};

export function AgenticTokenDiff() {
  const [mode, setMode] = useState<Mode>("naive");
  const { play } = useSound();
  const violations = CODE[mode].filter((line) => line.issue).length;
  return (
    <figure className="toy token-diff">
      <Segmented
        label="Which agent built it"
        options={MODES}
        value={mode}
        onChange={(next) => {
          setMode(next);
          play("toggle");
        }}
        render={(option) => (option === "naive" ? "Naive agent" : "Gated agent")}
      />
      <div className="token-diff__body">
        <AgenticCard mode={mode} />
        {/* Scrolls sideways on phones, so it must be reachable by keyboard. */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <pre className="token-diff__code" aria-label="Styles the agent wrote" tabIndex={0}>
          <code>
            {CODE[mode].map((line) => (
              <span
                key={line.property}
                className={`token-diff__line${line.issue ? " token-diff__line--bad" : ""}`}
              >
                <span className="token-diff__prop">{line.property}</span>: {line.value};
                {line.issue ? (
                  <span className="token-diff__issue">{` /* ${line.issue} */`}</span>
                ) : null}
                {"\n"}
              </span>
            ))}
          </code>
        </pre>
      </div>
      <p
        className={`token-diff__gate token-diff__gate--${violations ? "fail" : "pass"}`}
        aria-live="polite"
      >
        {violations ? (
          <CircleAlert aria-hidden="true" size={15} strokeWidth={2} />
        ) : (
          <CircleCheck aria-hidden="true" size={15} strokeWidth={2} />
        )}
        <code>pnpm run gate</code>
        <span>{violations ? `failed with ${violations} token violations` : "passed"}</span>
      </p>
    </figure>
  );
}

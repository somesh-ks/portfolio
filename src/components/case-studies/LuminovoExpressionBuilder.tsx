"use client";

/**
 * Recreation of the machine-time expression builder with made-up numbers:
 * toggle terms into the formula and the cost updates as you type.
 */
import { useId, useState } from "react";
import { useSound } from "@/components/providers/SoundProvider";

const TERMS = {
  setup: { label: "Setup time", unit: "min", initial: 45 },
  cycle: { label: "Cycle time per board", unit: "s", initial: 38 },
  quantity: { label: "Quantity", unit: "boards", initial: 500 },
  panel: { label: "Boards per panel", unit: "×", initial: 4 },
  rate: { label: "Machine rate", unit: "EUR/h", initial: 120 },
} as const;
type TermId = keyof typeof TERMS;
const OPTIONAL: TermId[] = ["setup", "panel"];

function cost(values: Record<TermId, number>, enabled: Record<TermId, boolean>): number {
  const perPanel = enabled.panel ? Math.max(1, values.panel) : 1;
  const runSeconds = (values.cycle * values.quantity) / perPanel;
  const setupSeconds = enabled.setup ? values.setup * 60 : 0;
  return ((runSeconds + setupSeconds) / 3600) * values.rate;
}

export function LuminovoExpressionBuilder() {
  const ids = useId();
  const { play } = useSound();
  const [values, setValues] = useState<Record<TermId, number>>(
    () =>
      Object.fromEntries(Object.entries(TERMS).map(([id, term]) => [id, term.initial])) as Record<
        TermId,
        number
      >,
  );
  const [enabled, setEnabled] = useState<Record<TermId, boolean>>({
    setup: true,
    cycle: true,
    quantity: true,
    panel: false,
    rate: true,
  });
  const total = cost(values, enabled);

  const formula = [
    enabled.setup ? "setup" : null,
    `cycle × quantity${enabled.panel ? " ÷ boards per panel" : ""}`,
  ]
    .filter(Boolean)
    .join(" + ");

  return (
    <figure className="toy expression">
      <fieldset className="expression__chips">
        <legend className="sr-only">Optional terms</legend>
        {OPTIONAL.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={enabled[id]}
            className="chip pressable"
            onClick={() => {
              setEnabled((current) => ({ ...current, [id]: !current[id] }));
              play("tick");
            }}
          >
            {TERMS[id].label}
          </button>
        ))}
      </fieldset>
      <p className="expression__formula">
        <code>({formula}) × rate</code>
      </p>
      <div className="expression__fields">
        {(Object.keys(TERMS) as TermId[]).map((id) => (
          <label key={id} htmlFor={`${ids}-${id}`} className="field" data-disabled={!enabled[id]}>
            <span className="field__label">{TERMS[id].label}</span>
            <span className="field__input">
              <input
                id={`${ids}-${id}`}
                type="number"
                inputMode="decimal"
                min={0}
                value={values[id]}
                disabled={!enabled[id]}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [id]: Math.max(0, Number(event.target.value) || 0),
                  }))
                }
              />
              <span className="field__unit">{TERMS[id].unit}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="expression__result" aria-live="polite">
        Machine cost{" "}
        <span className="tabular">
          EUR{" "}
          {total.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
        </span>
      </p>
      <figcaption className="toy__caption">
        Illustrative numbers. The production builder handled dozens of machine types.
      </figcaption>
    </figure>
  );
}

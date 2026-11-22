"use client";

import type { ReactNode } from "react";

interface SegmentedProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  render?: (value: T) => ReactNode;
}

/** A row of toggle buttons where exactly one is pressed. Buttons, not radios,
 * because each press is an action with immediate feedback. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  render,
}: SegmentedProps<T>) {
  return (
    <fieldset className="segmented">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className="segmented__item pressable"
        >
          {render ? render(option) : option}
        </button>
      ))}
    </fieldset>
  );
}

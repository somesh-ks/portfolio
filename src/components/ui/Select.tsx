"use client";

/**
 * A labelled dropdown on Base UI: one visible label, the current value on the
 * trigger, options in a popup. Base UI handles keyboard, typeahead and focus.
 * `hint` adds a quiet second column to an option, e.g. "fits a site".
 */
import { Select as Base } from "@base-ui/react/select";

/** A drawn chevron: a text "▾" sits off-centre and changes weight with the font. */
export function Chevron({ dir = "down" }: { dir?: "down" | "right" }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      style={dir === "right" ? { rotate: "-90deg" } : undefined}
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" />
    </svg>
  );
}

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
}: {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  /** Keep the label for screen readers only, e.g. in a toolbar. */
  hideLabel?: boolean;
}) {
  return (
    <Base.Root
      value={value}
      items={options.map((o) => ({ value: o.value, label: o.label }))}
      onValueChange={(v) => {
        if (v !== null) onChange(v);
      }}
    >
      <div className={hideLabel ? "select" : "field select"}>
        <Base.Label className={hideLabel ? "sr-only" : "field__label"}>{label}</Base.Label>
        <Base.Trigger className="select__trigger">
          <Base.Value className="select__value" />
          <Base.Icon className="select__icon" aria-hidden>
            <Chevron />
          </Base.Icon>
        </Base.Trigger>
      </div>
      <Base.Portal>
        <Base.Positioner
          sideOffset={4}
          alignItemWithTrigger={false}
          collisionPadding={16}
          className="z-50"
        >
          <Base.Popup className="select__popup">
            <Base.List>
              {options.map((o) => (
                <Base.Item key={o.value} value={o.value} className="select__item">
                  <Base.ItemIndicator className="select__check" aria-hidden>
                    ✓
                  </Base.ItemIndicator>
                  <Base.ItemText className="select__text">{o.label}</Base.ItemText>
                  {o.hint ? <span className="select__hint">{o.hint}</span> : null}
                </Base.Item>
              ))}
            </Base.List>
          </Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  );
}

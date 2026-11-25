/**
 * The homepage "tune" toy: what each setting writes to <html>.
 * The token math lives in src/styles/tune.css; this only sets its inputs.
 */
export interface Tune {
  /** Hue for tinted neutrals; null keeps the greys neutral. */
  hue: number | null;
  type: "sans" | "mono";
  size: "14" | "15" | "16";
  /** Multiplier on every space step. */
  density: number;
}

export const TUNE_DEFAULT: Tune = { hue: null, type: "sans", size: "14", density: 1 };

export const TUNE_RANGE = {
  hue: { min: 0, max: 359, step: 1, first: 250 },
  density: { min: 0.75, max: 1.5, step: 0.05 },
} as const;

export const isDefault = (t: Tune) =>
  t.hue === null &&
  t.type === TUNE_DEFAULT.type &&
  t.size === TUNE_DEFAULT.size &&
  t.density === TUNE_DEFAULT.density;

/** Attributes and custom properties for <html>; an absent key means remove it. */
export function tuneOutput(t: Tune): {
  attrs: Record<string, string>;
  vars: Record<string, string>;
} {
  const attrs: Record<string, string> = {};
  const vars: Record<string, string> = {};
  if (t.size !== "14" || t.density !== 1) {
    attrs["data-tune"] = "";
    vars["--tune-f"] = String(Number(t.size) / 14);
    vars["--tune-d"] = String(t.density);
  }
  if (t.type !== "sans") attrs["data-tune-type"] = t.type;
  if (t.hue !== null) {
    attrs["data-tune-hue"] = "";
    vars["--tune-h"] = String(t.hue);
  }
  return { attrs, vars };
}

const TUNE_ATTRS = ["data-tune", "data-tune-type", "data-tune-hue"] as const;
const TUNE_VARS = ["--tune-f", "--tune-d", "--tune-h"] as const;

/** Writes a tune to <html>, clearing whatever it doesn't set. */
export function applyTune(el: HTMLElement, t: Tune) {
  const { attrs, vars } = tuneOutput(t);
  for (const a of TUNE_ATTRS) {
    if (a in attrs) el.setAttribute(a, attrs[a]!);
    else el.removeAttribute(a);
  }
  for (const v of TUNE_VARS) {
    if (v in vars) el.style.setProperty(v, vars[v]!);
    else el.style.removeProperty(v);
  }
}

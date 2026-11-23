/**
 * Share links carry only the input (a few hundred bytes), never the
 * generated values, so links stay short and always rebuild with the
 * current engine. `v` lets a future engine migrate old links.
 */
import { DEFAULT_INPUT, type SystemInput } from "./system";
import { FONT_NAMES, SAFE_FONT, type FontMeta, type FontTag } from "./type";

const b64url = {
  encode: (s: string) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(s)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
  decode: (s: string) =>
    new TextDecoder().decode(
      Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
    ),
};

const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function encodeInput(input: SystemInput): string {
  const i = input;
  const compact = [
    i.v,
    i.name,
    [
      Math.round(i.accent.hue),
      r3(i.accent.chroma),
      i.accent.solidL === undefined ? null : r3(i.accent.solidL),
      i.accent.label ?? "auto",
    ],
    i.neutralHue === undefined ? r3(i.neutralTint) : [r3(i.neutralTint), Math.round(i.neutralHue)],
    [
      i.type.body,
      i.type.heading,
      i.type.mono,
      i.type.base,
      r3(i.type.ratio),
      i.type.headingWeight,
      i.type.fluid ? 1 : 0,
      ...(i.type.extra
        ? [Object.entries(i.type.extra).map(([n, m]) => [n, m.tag, m.weights, m.variable ?? 0])]
        : []),
    ],
    r3(i.density),
    r3(i.roundness),
    r3(i.motion),
    [
      i.stack.building,
      i.stack.ownership,
      i.stack.styling,
      i.stack.components ?? null,
      i.stack.icons ?? null,
    ],
  ];
  return b64url.encode(JSON.stringify(compact));
}

const num = (v: unknown, lo: number, hi: number, d: number) =>
  typeof v === "number" && v >= lo && v <= hi ? v : d;
const oneOf = <T extends string>(v: unknown, opts: readonly T[], d: T): T =>
  opts.includes(v as T) ? (v as T) : d;

const TAGS = ["sans", "serif", "display", "mono", "hand"] as const satisfies FontTag[];
const weight = (w: unknown) => typeof w === "number" && Number.isInteger(w) && w >= 1 && w <= 1000;

/** Extra fonts come from a URL anyone can write, so every field is checked. */
function decodeExtra(v: unknown): Record<string, FontMeta> | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: Record<string, FontMeta> = {};
  for (const row of v.slice(0, 3)) {
    if (!Array.isArray(row)) continue;
    const [n, tag, ws, vr] = row as unknown[];
    if (typeof n !== "string" || !SAFE_FONT.test(n)) continue;
    if (!Array.isArray(ws) || !ws.length || ws.length > 18 || !ws.every(weight)) continue;
    const variable =
      Array.isArray(vr) && vr.length === 2 && vr.every(weight) && vr[0] < vr[1]
        ? ([vr[0], vr[1]] as [number, number])
        : null;
    out[n] = { tag: oneOf(tag, TAGS, "sans"), weights: ws as number[], variable };
  }
  return Object.keys(out).length ? out : undefined;
}

export function decodeInput(s: string | null | undefined): SystemInput | null {
  if (!s) return null;
  try {
    const a = JSON.parse(b64url.decode(s)) as unknown[];
    if (!Array.isArray(a) || a[0] !== 1) return null;
    const D = DEFAULT_INPUT;
    const [acc, t, st] = [a[2] as unknown[], a[4] as unknown[], a[8] as unknown[]];
    const extra = decodeExtra(t?.[7]);
    const fonts = [...FONT_NAMES, ...Object.keys(extra ?? {})];
    return {
      v: 1,
      name: typeof a[1] === "string" ? a[1].slice(0, 60) : D.name,
      accent: {
        hue: num(acc?.[0], 0, 360, D.accent.hue),
        chroma: num(acc?.[1], 0, 0.4, D.accent.chroma),
        solidL: typeof acc?.[2] === "number" ? num(acc[2], 0.2, 0.95, 0.55) : undefined,
        label: oneOf(acc?.[3], ["auto", "white", "ink"] as const, "auto"),
      },
      neutralTint: num(Array.isArray(a[3]) ? a[3][0] : a[3], 0, 1, D.neutralTint),
      neutralHue: Array.isArray(a[3]) ? num(a[3][1], 0, 360, 0) : undefined,
      type: {
        body: oneOf(t?.[0], fonts, D.type.body),
        heading: oneOf(t?.[1], fonts, D.type.heading),
        mono: oneOf(t?.[2], fonts, D.type.mono),
        base: num(t?.[3], 12, 22, D.type.base),
        ratio: num(t?.[4], 1.05, 1.7, D.type.ratio),
        headingWeight: num(t?.[5], 100, 900, D.type.headingWeight),
        fluid: t?.[6] !== 0,
        ...(extra ? { extra } : {}),
      },
      density: num(a[5], 0, 1, D.density),
      roundness: num(a[6], 0, 1, D.roundness),
      motion: num(a[7], 0, 1, D.motion),
      stack: {
        building: oneOf(st?.[0], ["site", "app", "dashboard"] as const, D.stack.building),
        ownership: oneOf(st?.[1], ["own", "package"] as const, D.stack.ownership),
        styling: oneOf(st?.[2], ["tailwind", "css"] as const, D.stack.styling),
        components: typeof st?.[3] === "string" ? st[3] : undefined,
        icons: typeof st?.[4] === "string" ? st[4] : undefined,
      },
    };
  } catch {
    return null;
  }
}

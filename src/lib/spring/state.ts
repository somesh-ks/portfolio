/**
 * Share links carry only the input (a few hundred bytes), never the
 * generated values, so links stay short and always rebuild with the
 * current engine. `v` lets a future engine migrate old links.
 */
import { CHART_MAX, CHART_SUGGESTED } from "./charts";
import {
  DEFAULT_INPUT,
  MAX_STRIPS,
  STATUS_RANGE,
  type StatusName,
  type SystemInput,
} from "./system";
import { COMPONENTS, ICONS } from "./stack";
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
const r4 = (n: number) => Math.round(n * 10000) / 10000;

export function encodeInput(input: SystemInput): string {
  const i = input;
  const compact = [
    i.v,
    i.name,
    [
      Math.round(i.primary.hue * 10) / 10,
      r4(i.primary.chroma),
      i.primary.solidL === undefined ? null : r4(i.primary.solidL),
      i.primary.label ?? "auto",
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
    i.curve
      ? [
          ...i.curve.bezier.map(r3),
          Math.round(i.curve.hueShift),
          ...(i.curve.darkChroma === undefined ? [] : [r3(i.curve.darkChroma)]),
        ]
      : null,
    i.status ? STATUSES.map((n) => i.status?.[n] ?? null) : null,
    i.contrast ?? null,
    i.colors?.length ? i.colors.map((c) => [c.name, c.hex]) : null,
    // a[13] held the old chart settings; links that carry it ignore it now.
    null,
    i.data ? i.data.map((c) => [c.name, c.hex]) : null,
    i.ramps ? [i.ramps.seq ?? null, i.ramps.div ?? null] : null,
  ];
  // Old links end at the curve; keep new ones as short when the extras are unset.
  while (compact.length > 9 && compact.at(-1) === null) compact.pop();
  return b64url.encode(JSON.stringify(compact));
}

/** A ramp points at a data strip by position, so it must name one that exists. */
const index = (v: unknown, len: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v < len ? v : undefined;
const ramps = ([seq, div]: unknown[], len: number) => {
  const at = (x: unknown) => index(x, len);
  const a = Array.isArray(div) ? [at(div[0]), at(div[1])] : [];
  return {
    seq: at(seq),
    div: a[0] !== undefined && a[1] !== undefined ? ([a[0], a[1]] as [number, number]) : undefined,
  };
};
const isStrip = (c: unknown): c is [string, string] =>
  Array.isArray(c) && typeof c[0] === "string" && isHex(c[1]);
/** Ramps point at strips by position, so one bad entry drops the whole list rather than shifting it. */
const strips = (v: unknown[], max: number) =>
  v.length <= max && v.every(isStrip)
    ? v.map(([name, hex]) => ({ name: name.slice(0, 24), hex }))
    : undefined;
const pick = (v: unknown, from: Record<string, unknown>) =>
  typeof v === "string" && Object.hasOwn(from, v) ? v : undefined;

const STATUSES = Object.keys(STATUS_RANGE) as StatusName[];
const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

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
    const colors = Array.isArray(a[12]) ? strips(a[12], MAX_STRIPS) : undefined;
    const data = Array.isArray(a[14]) ? strips(a[14], CHART_MAX) : undefined;
    return {
      v: 1,
      name: typeof a[1] === "string" ? a[1].slice(0, 60) : D.name,
      primary: {
        hue: num(acc?.[0], 0, 360, D.primary.hue),
        chroma: num(acc?.[1], 0, 0.4, D.primary.chroma),
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
        styling: oneOf(st?.[2], ["tailwind", "css", "dtcg"] as const, D.stack.styling),
        components: pick(st?.[3], COMPONENTS),
        icons: pick(st?.[4], ICONS),
      },
      ...(Array.isArray(a[9]) && (a[9].length === 5 || a[9].length === 6)
        ? {
            curve: {
              bezier: [
                num(a[9][0], 0, 1, 0.4),
                num(a[9][1], -0.5, 1.5, 0.08),
                num(a[9][2], 0, 1, 0.9),
                num(a[9][3], -0.5, 1.5, 0.6),
              ],
              hueShift: num(a[9][4], -60, 60, 0),
              ...(typeof a[9][5] === "number" ? { darkChroma: num(a[9][5], 0.4, 1.2, 1) } : {}),
            },
          }
        : {}),
      ...(Array.isArray(a[10])
        ? {
            status: Object.fromEntries(
              STATUSES.flatMap((n, k) => {
                const v = (a[10] as unknown[])[k];
                return isHex(v) ? [[n, v]] : [];
              }),
            ),
          }
        : {}),
      ...(a[11] === "aaa" || a[11] === "apca" ? { contrast: a[11] } : {}),
      ...(colors ? { colors } : {}),
      ...(data ? { data } : {}),
      // Without a[14] the ramps point at the suggested strips; a rejected a[14] drops them too.
      ...(Array.isArray(a[15]) && (data || !Array.isArray(a[14]))
        ? { ramps: ramps(a[15], data?.length ?? CHART_SUGGESTED) }
        : {}),
    };
  } catch {
    return null;
  }
}

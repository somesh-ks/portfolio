/**
 * Font pairing by feel. Each curated font sits on four axes (see
 * fonts.curated.ts); a mood is a point on those axes, and pairings are
 * ranked by distance to it plus a few pairing rules. Pure and deterministic.
 */
import type { Feel, Genre } from "./fonts.curated";
import { FONTS } from "./fonts.data";
import type { FontName } from "./type";

export type Building = "site" | "app" | "dashboard";

const AXES = ["warmth", "energy", "era", "formality"] as const;
const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;

/** Moods offered in the type tool. */
export const MOODS: Record<string, { label: string; feel: Feel }> = {
  neutral: { label: "Neutral", feel: { warmth: -0.2, energy: -0.4, era: 0.3, formality: 0.3 } },
  warm: { label: "Warm", feel: { warmth: 0.7, energy: 0, era: -0.1, formality: -0.2 } },
  precise: { label: "Precise", feel: { warmth: -0.7, energy: -0.2, era: 0.7, formality: 0.4 } },
  editorial: { label: "Editorial", feel: { warmth: 0.2, energy: 0, era: -0.6, formality: 0.6 } },
  playful: { label: "Playful", feel: { warmth: 0.5, energy: 0.8, era: 0.4, formality: -0.7 } },
  premium: { label: "Premium", feel: { warmth: 0.2, energy: -0.5, era: -0.4, formality: 0.8 } },
};

const distance = (a: Feel, b: Feel) => Math.hypot(...AXES.map((k) => a[k] - b[k]));

// ——— Fonts ———

type FontData = (typeof FONTS)[FontName];
const font = (n: FontName) =>
  FONTS[n] as FontData & { jobs: readonly string[]; feel: Feel; tag: Genre };
const names = Object.keys(FONTS) as FontName[];
const can = (n: FontName, job: "heading" | "body" | "mono") => font(n).jobs.includes(job);
const xh = (n: FontName) => font(n).xHeight / font(n).unitsPerEm;
const family = (n: FontName) => n.split(" ")[0]!;

/** Body text wants a calmer version of the brief: loud body faces tire readers. */
const bodyTarget = (t: Feel): Feel => ({ ...t, energy: Math.min(t.energy, 0) * 0.6 });

export interface Pairing {
  heading: FontName;
  body: FontName;
  mono: FontName;
  score: number;
  /** Why the two work together, in plain words. */
  reasons: string[];
}

function pairScore(h: FontName, b: FontName, t: Feel, building: Building) {
  const H = font(h);
  const B = font(b);
  let s = distance(H.feel, t) + 0.7 * distance(B.feel, bodyTarget(t));
  // Interfaces are read in short bursts at small sizes: serif body is for sites.
  if (B.tag === "serif" && building !== "site") s += 10;
  const reasons: string[] = [];
  if (h === b) {
    s += 0.15;
    reasons.push(
      "One family in several weights: the safest pairing, with hierarchy from size and weight.",
    );
  } else if (H.tag === "sans" && B.tag === "sans") {
    s += 0.6; // two near-identical grotesks look like a mistake
  } else if (H.tag === "serif" && B.tag === "serif") {
    s += 0.45;
  } else if (H.tag === "serif" && B.tag === "sans") {
    reasons.push(
      "Serif headlines over a sans body: a clear contrast in class, so roles read at a glance.",
    );
  } else if (H.tag === "display") {
    reasons.push("A display face for headlines only, with a plain sans doing the reading.");
  } else if (B.tag === "serif") {
    reasons.push("A serif body for long reading, with sans headlines kept short and strong.");
  }
  if (h !== b) {
    const gap = Math.abs(xh(h) - xh(b)) / xh(b);
    if (gap > 0.08) s += 0.3;
    else if (gap < 0.04)
      reasons.push(
        `x-heights within ${Math.max(1, Math.round(gap * 100))}%, so mixed lines sit level.`,
      );
  }
  if (H.weights.length === 1)
    reasons.push(`${h} comes in one weight, so headings stay at ${H.weights[0]}.`);
  // Very common faces read as "no decision made" for a brand's voice.
  if (H.popularity <= 10) s += 0.25;
  return { s, reasons };
}

function monoFor(h: FontName, b: FontName, t: Feel): FontName {
  const monos = names.filter((n) => can(n, "mono"));
  const kin = monos.find((m) => family(m) === family(b) || family(m) === family(h));
  if (kin) return kin;
  return monos.sort((x, y) => distance(font(x).feel, t) - distance(font(y).feel, t))[0]!;
}

/** Best heading/body pairings for a feel, best first. */
export function pairings(
  t: Feel,
  n = 8,
  filter?: (p: Pairing) => boolean,
  building: Building = "app",
): Pairing[] {
  const out: Pairing[] = [];
  for (const h of names.filter((x) => can(x, "heading")))
    for (const b of names.filter((x) => can(x, "body"))) {
      const { s, reasons } = pairScore(h, b, t, building);
      const p: Pairing = { heading: h, body: b, mono: monoFor(h, b, t), score: round(s), reasons };
      if (!filter || filter(p)) out.push(p);
    }
  out.sort((a, b) => a.score - b.score);
  // Keep the list varied: at most two pairings per heading face.
  const seen = new Map<string, number>();
  return out
    .filter((p) => {
      const c = seen.get(p.heading) ?? 0;
      seen.set(p.heading, c + 1);
      return c < 2;
    })
    .slice(0, n);
}

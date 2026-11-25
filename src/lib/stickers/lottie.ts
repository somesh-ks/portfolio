import { bounds, clipFor, FPS, type Look } from "./look";
import { type Layer, type Step, trackIsStatic } from "./model";

/** Lottie units per cell. */
const U = 10;

const rgb = (hex: string): [number, number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
};

const still = (k: unknown) => ({ a: 0, k });

function shapeGroup(l: Layer) {
  return {
    ty: "gr",
    nm: l.color,
    it: [
      ...l.rects.map((r) => ({
        ty: "rc",
        d: 1,
        nm: "cell",
        s: still([r.w * U, r.h * U]),
        p: still([(r.x + r.w / 2) * U, (r.y + r.h / 2) * U]),
        r: still(0),
      })),
      { ty: "fl", nm: "fill", c: still(rgb(l.color)), o: still(l.alpha * 100), r: 1, bm: 0 },
      {
        ty: "tr",
        p: still([0, 0]),
        a: still([0, 0]),
        s: still([100, 100]),
        r: still(0),
        o: still(100),
        sk: still(0),
        sa: still(0),
      },
    ],
  };
}

/** Hold keyframes: a Lottie keyframe with h:1 jumps, which keeps pixel art crisp. */
function holdKeys<T>(track: Step[], pick: (s: Step) => T) {
  const out: Array<{ t: number; s: T; h: 1 }> = [];
  let prev = "";
  track.forEach((s, i) => {
    const v = pick(s);
    const key = JSON.stringify(v);
    if (key === prev) return;
    prev = key;
    out.push({ t: i, s: v, h: 1 });
  });
  return out;
}

/** Lottie JSON (bodymovin 5.x): one shape layer per part, position and opacity on hold keyframes. */
export function lottieJson(look: Look): object {
  const clip = clipFor(look);
  const box = bounds(look);
  const N = clip.frames;
  const parts = clip.parts.filter((p) => p.track.some((s) => s[2] === 1));
  const oxU = box.x * U;
  const oyU = box.y * U;

  // Lottie draws the first layer on top, so emit front-to-back. Rects keep their own cell
  // coordinates; the layer position carries the track minus the crop origin.
  const layers = parts.toReversed().map((p, i) => {
    const pos = trackIsStatic(p.track)
      ? still([(p.track[0]?.[0] ?? 0) * U - oxU, (p.track[0]?.[1] ?? 0) * U - oyU, 0])
      : { a: 1, k: holdKeys(p.track, (s) => [s[0] * U - oxU, s[1] * U - oyU, 0]) };
    const opacity = p.track.some((s) => s[2] === 0)
      ? { a: 1, k: holdKeys(p.track, (s) => [s[2] * 100]) }
      : still(100);
    return {
      ddd: 0,
      ind: i + 1,
      ty: 4,
      nm: p.id,
      sr: 1,
      ao: 0,
      ip: 0,
      op: N,
      st: 0,
      bm: 0,
      ks: { o: opacity, r: still(0), p: pos, a: still([0, 0, 0]), s: still([100, 100, 100]) },
      shapes: p.layers.toReversed().map(shapeGroup), // first shape draws on top
    };
  });

  // A single-keyframe animated property is valid but wasteful; flatten those.
  const flat = JSON.parse(
    JSON.stringify({ layers }),
    (_k, v: { a?: number; k?: Array<{ s: unknown }> } | null) =>
      v && v.a === 1 && Array.isArray(v.k) && v.k.length === 1 ? { a: 0, k: v.k[0]?.s } : v,
  ) as { layers: object[] };
  return {
    v: "5.7.4",
    fr: FPS,
    ip: 0,
    op: N,
    w: Math.round(box.w * U),
    h: Math.round(box.h * U),
    nm: `Claude sticker ${look.action}`,
    ddd: 0,
    assets: [],
    layers: flat.layers,
    markers: [],
  };
}

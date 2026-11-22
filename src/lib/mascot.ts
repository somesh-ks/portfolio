/**
 * The mascot as data: every frame is a list of rectangles on a 16 x 14 grid.
 * The renderer, the web component and every exporter read this one model.
 */
export const GRID = { width: 16, height: 14 } as const;
export const ANIMATIONS = ["idle", "wave", "jump", "blink", "look"] as const;
export type Animation = (typeof ANIMATIONS)[number];
export type Part = "body" | "eye" | "limb";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  part: Part;
}

export interface FrameOptions {
  /** Drop spatial travel (bob, jump) but keep expression changes. */
  reducedMotion?: boolean;
}

const BLINK_PERIOD = 3.2;
const BLINK_LENGTH = 0.14;

function blinking(t: number, animation: Animation): boolean {
  if (animation === "blink") return t % 0.9 < 0.18;
  return t % BLINK_PERIOD > BLINK_PERIOD - BLINK_LENGTH;
}

export function frame(
  animation: Animation,
  t: number,
  { reducedMotion = false }: FrameOptions = {},
): Rect[] {
  let lift = 0;
  let legHeight = 2;
  let lookX = 0;
  let armRaised = false;

  switch (animation) {
    case "idle":
      lift = Math.floor(t / 0.8) % 2 === 0 ? 0 : 0.5;
      break;
    case "wave":
      armRaised = Math.floor(t / 0.22) % 2 === 0;
      break;
    case "jump": {
      const phase = (t % 1.2) / 0.6;
      if (phase < 1) {
        lift = Math.round(Math.sin(Math.PI * phase) * 6) / 2;
        legHeight = lift > 1 ? 1 : 2;
      }
      break;
    }
    case "look":
      lookX = [0, 1, 1, 0, -1, -1][Math.floor(t / 0.45) % 6] ?? 0;
      break;
    case "blink":
      break;
    default: {
      const exhaustive: never = animation;
      return exhaustive;
    }
  }
  if (reducedMotion) {
    lift = 0;
    legHeight = 2;
  }

  const y = (value: number) => value - lift;
  const eyesClosed = blinking(t, animation);
  const eyeHeight = eyesClosed ? 0.5 : 2;
  const eyeTop = eyesClosed ? 6.5 : 5;

  return [
    { x: 3, y: y(3), w: 10, h: 7, part: "body" },
    { x: 1, y: y(6), w: 2, h: 2, part: "body" },
    armRaised
      ? { x: 13, y: y(3), w: 2, h: 3, part: "body" }
      : { x: 13, y: y(6), w: 2, h: 2, part: "body" },
    { x: 5 + lookX, y: y(eyeTop), w: 1, h: eyeHeight, part: "eye" },
    { x: 10 + lookX, y: y(eyeTop), w: 1, h: eyeHeight, part: "eye" },
    ...[4, 6, 9, 11].map((x) => ({ x, y: y(10), w: 1, h: legHeight, part: "limb" as const })),
  ];
}

/** Duration of one loop, used by exporters. */
export const LOOP_SECONDS: Record<Animation, number> = {
  idle: 1.6,
  wave: 0.88,
  jump: 1.2,
  blink: 0.9,
  look: 2.7,
};

export const PART_FILL: Record<Part, string> = {
  body: "var(--illustration-mascot)",
  eye: "var(--illustration-mascot-ink)",
  limb: "var(--illustration-mascot)",
};

/** Literal colours for exports that leave the site (no CSS variables there). */
const EXPORT_FILL: Record<Part, string> = { body: "#d97a55", eye: "#1f1d1a", limb: "#d97a55" };

function rectsToSvgMarkup(rects: Rect[], fills: Record<Part, string> = PART_FILL): string {
  return rects
    .map(
      (rect) =>
        `<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" fill="${fills[rect.part]}"/>`,
    )
    .join("");
}

const EXPORT_FPS = 12;

function sampleFrames(animation: Animation): Rect[][] {
  const count = Math.max(1, Math.round(LOOP_SECONDS[animation] * EXPORT_FPS));
  return Array.from({ length: count }, (_, index) => frame(animation, index / EXPORT_FPS));
}

/** Self-contained animated SVG (CSS flipbook). Respects reduced motion on its own. */
export function exportAnimatedSvg(animation: Animation): string {
  const frames = sampleFrames(animation);
  const duration = frames.length / EXPORT_FPS;
  const slot = 100 / frames.length;
  const groups = frames
    .map(
      (rects, index) =>
        `<g class="f" style="animation-delay:${(index / EXPORT_FPS).toFixed(3)}s">${rectsToSvgMarkup(rects, EXPORT_FILL)}</g>`,
    )
    .join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -2 ${GRID.width} ${GRID.height + 2}" shape-rendering="crispEdges" role="img" aria-label="Mascot, ${animation} animation">`,
    `<style>.f{opacity:0;animation:k ${duration.toFixed(3)}s step-end infinite}@keyframes k{0%{opacity:1}${slot.toFixed(3)}%{opacity:0}}`,
    `@media (prefers-reduced-motion:reduce){.f{animation:none}.f:first-of-type{opacity:1}}</style>`,
    groups,
    "</svg>",
  ].join("");
}

function hexToLottie(hex: string): [number, number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255, 1];
}

const SCALE = 32;
const still = <T>(k: T) => ({ a: 0, k });

/** Lottie JSON: one shape layer per frame, shown for exactly one frame. */
export function exportLottie(animation: Animation): object {
  const frames = sampleFrames(animation);
  return {
    v: "5.12.0",
    fr: EXPORT_FPS,
    ip: 0,
    op: frames.length,
    w: GRID.width * SCALE,
    h: (GRID.height + 2) * SCALE,
    nm: `mascot-${animation}`,
    ddd: 0,
    assets: [],
    layers: frames.map((rects, index) => ({
      ddd: 0,
      ind: index + 1,
      ty: 4,
      nm: `frame ${index}`,
      ip: index,
      op: index + 1,
      st: 0,
      sr: 1,
      ks: {
        o: still(100),
        r: still(0),
        p: still([0, 2 * SCALE]),
        a: still([0, 0]),
        s: still([100, 100]),
      },
      shapes: rects.map((rect) => ({
        ty: "gr",
        it: [
          {
            ty: "rc",
            d: 1,
            p: still([(rect.x + rect.w / 2) * SCALE, (rect.y + rect.h / 2) * SCALE]),
            s: still([rect.w * SCALE, rect.h * SCALE]),
            r: still(0),
          },
          { ty: "fl", c: still(hexToLottie(EXPORT_FILL[rect.part])), o: still(100), r: 1 },
          {
            ty: "tr",
            p: still([0, 0]),
            a: still([0, 0]),
            s: still([100, 100]),
            r: still(0),
            o: still(100),
          },
        ],
      })),
    })),
  };
}

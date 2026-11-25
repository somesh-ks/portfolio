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

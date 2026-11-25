/**
 * Actions are body motion only: they own no props, so any item can combine with any action.
 * A pose is relative to the mascot: `body` moves everything, arms and legs are offsets from
 * where the body is, so a limb can never detach. Legs only tuck up (0 or -1 row), so at least two rows of every leg always show.
 */
export interface Pose {
  body?: readonly [number, number];
  /** Arm offsets from the body. Outward dx is capped at 3 cells (the arm roots cover that). */
  armL?: readonly [number, number];
  armR?: readonly [number, number];
  /** Rows each leg tucks up into the torso, 0 or -1. Clamped by the rig. */
  legs?: readonly [number, number, number, number];
  eyes?: "open" | "closed" | "happy";
  /** Eye glance in cells. */
  eye?: readonly [number, number];
  /** Ground shadow size: 0 normal, 1 smaller, 2 smallest (airborne). */
  shadow?: 0 | 1 | 2;
}

export type ActionId =
  | "idle"
  | "wave"
  | "nod"
  | "shrug"
  | "peek"
  | "walk"
  | "run"
  | "dance"
  | "cheer"
  | "jump"
  | "zen"
  | "sleep";

export interface ActionDef {
  id: ActionId;
  name: string;
  frames: number;
  /** The hero frame: thumbnails, stills and the default paused frame. */
  still: number;
  pose: (f: number) => Pose;
}

const blink = (f: number, at: number[]) => at.includes(f);

const idle: ActionDef = {
  id: "idle",
  name: "Idle",
  frames: 24,
  still: 0,
  pose: (f) => ({
    body: [0, f >= 6 && f < 18 ? 1 : 0],
    eyes: blink(f, [20, 21]) ? "closed" : "open",
  }),
};

const wave: ActionDef = {
  id: "wave",
  name: "Wave",
  frames: 24,
  still: 2,
  pose: (f) => ({
    body: [0, f % 12 >= 6 ? 1 : 0],
    armR: f % 6 < 3 ? [0, -4] : [0, -2],
    eyes: f >= 2 && f <= 20 ? "happy" : "open",
  }),
};

const walk: ActionDef = {
  id: "walk",
  name: "Walk",
  frames: 24,
  still: 2,
  pose: (f) => {
    const a = f % 12 < 6;
    return {
      body: [0, f % 6 < 3 ? 1 : 0],
      legs: a ? [-1, 0, 0, -1] : [0, -1, -1, 0],
      armL: a ? [0, -1] : [0, 1],
      armR: a ? [0, 1] : [0, -1],
      eyes: blink(f, [20, 21]) ? "closed" : "open",
    };
  },
};

// Body-motion extras. Each is one idea: a dip, a lift, a lean.
const nod: ActionDef = {
  id: "nod",
  name: "Nod",
  frames: 24,
  still: 4,
  pose: (f) => {
    const dip = (f >= 3 && f < 7) || (f >= 9 && f < 13);
    return {
      body: [0, dip ? 1 : 0],
      eyes: dip ? "happy" : blink(f, [20, 21]) ? "closed" : "open",
    };
  },
};

const shrug: ActionDef = {
  id: "shrug",
  name: "Shrug",
  frames: 24,
  still: 7,
  pose: (f) => {
    const lift = f >= 6 && f < 12 ? -2 : (f >= 4 && f < 6) || (f >= 12 && f < 14) ? -1 : 0;
    return {
      armL: [0, lift],
      armR: [0, lift],
      eyes: "open",
      eye: f >= 6 && f < 9 ? [-1, 0] : f >= 9 && f < 12 ? [1, 0] : [0, 0],
    };
  },
};

const peek: ActionDef = {
  id: "peek",
  name: "Peek",
  frames: 24,
  still: 6,
  pose: (f) => {
    const dx = f >= 4 && f < 10 ? -1 : f >= 12 && f < 18 ? 1 : 0;
    return { body: [dx, 0], eyes: "open", eye: [dx, 0] };
  },
};

// A fast walk: contact and flight every two frames, a bigger bob, arms pumping.
const run: ActionDef = {
  id: "run",
  name: "Run",
  frames: 24,
  still: 2,
  pose: (f) => {
    const p = f % 4;
    const air = p % 2 === 1;
    const a = f % 8 < 4;
    return {
      body: [0, air ? -1 : 1],
      legs: air ? [-1, -1, -1, -1] : p === 0 ? [-1, 0, 0, -1] : [0, -1, -1, 0],
      armL: a ? [0, -2] : [0, 2],
      armR: a ? [0, 2] : [0, -2],
      eyes: "open",
      eye: [1, 0],
      shadow: air ? 1 : 0,
    };
  },
};

const dance: ActionDef = {
  id: "dance",
  name: "Dance",
  frames: 24,
  still: 4,
  pose: (f) => {
    const b = Math.floor(f / 6) % 4;
    return {
      body: [[-1, 0, 1, 0][b] ?? 0, f % 6 < 3 ? 0 : 1],
      legs: f % 12 < 6 ? [-1, 0, 0, -1] : [0, -1, -1, 0],
      armL: b % 2 === 0 ? [0, -3] : [0, 0],
      armR: b % 2 === 1 ? [0, -3] : [0, 0],
      eyes: "happy",
    };
  },
};

const CHEER_DY = [1, 1, 1, 0, -2, -4, -5, -5, -5, -4, -2, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const cheer: ActionDef = {
  id: "cheer",
  name: "Cheer",
  frames: 24,
  still: 7,
  pose: (f) => {
    const dy = CHEER_DY[f] ?? 0;
    const air = f >= 4 && f <= 10;
    const tuck = air ? -1 : 0;
    return {
      body: [0, dy],
      legs: [tuck, tuck, tuck, tuck],
      armL: air ? [-1, f >= 6 && f <= 8 ? -4 : -3] : dy > 0 ? [0, 1] : [0, 0],
      armR: air ? [1, f >= 6 && f <= 8 ? -4 : -3] : dy > 0 ? [0, 1] : [0, 0],
      eyes: f === 12 || f === 13 ? "closed" : f >= 4 && f <= 20 ? "happy" : "open",
      shadow: dy <= -4 ? 2 : dy < 0 ? 1 : 0,
    };
  },
};

// A hop: crouch, push off, legs tucked at the top, a squash on landing, then a beat of rest.
const JUMP_DY = [0, 1, 1, 0, -3, -6, -8, -8, -7, -4, -1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const JUMP_TUCK = [0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const jump: ActionDef = {
  id: "jump",
  name: "Jump",
  frames: 24,
  still: 6,
  pose: (f) => {
    const dy = JUMP_DY[f] ?? 0;
    const t = JUMP_TUCK[f] ?? 0;
    const up = f >= 4 && f <= 10;
    return {
      body: [0, dy],
      legs: [t, t, t, t],
      armL: up ? [-1, -3] : f >= 1 && f <= 2 ? [0, 1] : f === 11 || f === 12 ? [0, 1] : [0, 0],
      armR: up ? [1, -3] : f >= 1 && f <= 2 ? [0, 1] : f === 11 || f === 12 ? [0, 1] : [0, 0],
      eyes: up ? "happy" : f === 11 || f === 12 ? "closed" : blink(f, [19, 20]) ? "closed" : "open",
      shadow: dy <= -6 ? 2 : dy < -2 ? 1 : 0,
    };
  },
};

// Cross-legged hover. The legs are body-relative and tucked one row, so they ride along and
// still show.
const zen: ActionDef = {
  id: "zen",
  name: "Zen",
  frames: 24,
  still: 0,
  pose: (f) => ({
    body: [0, f >= 6 && f < 18 ? -2 : -1],
    legs: [-1, -1, -1, -1],
    armL: [0, -1],
    armR: [0, -1],
    eyes: "closed",
    shadow: 2,
  }),
};

const sleep: ActionDef = {
  id: "sleep",
  name: "Sleep",
  frames: 48,
  still: 14,
  pose: (f) => ({ body: [0, f >= 14 && f < 38 ? 1 : 0], eyes: "closed" }),
};

export const ACTION_DEFS: readonly ActionDef[] = [
  idle,
  wave,
  nod,
  shrug,
  peek,
  walk,
  run,
  dance,
  cheer,
  jump,
  zen,
  sleep,
];

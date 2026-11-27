/**
 * The runner as pure data: no DOM, no clock, no Math.random. The renderer
 * calls `step` at a fixed rate; tests drive it directly. Units are grid cells
 * and seconds.
 */
import { OBSTACLE_SPRITES, OBSTACLES, type ObstacleKind } from "./sprites";

export const WORLD = {
  /** Visible height in cells; the renderer picks the width from the aspect. */
  height: 64,
  /** Top of the ground line. */
  ground: 56,
  /** Where the mascot's left edge sits. */
  mascotX: 8,
  /** Narrowest view, in cells: about a second of warning at top speed. */
  minWidth: 100,
} as const;

export const PHYSICS = {
  /** Jump apex in cells and time in the air, which set gravity and lift. */
  apex: 30,
  airtime: 0.66,
  startSpeed: 70,
  acceleration: 1.5,
  maxSpeed: 150,
  /** A press this close before landing still counts. */
  jumpBuffer: 0.12,
  /** Cells of distance per point. */
  cellsPerPoint: 8,
} as const;

export const STEP = 1 / 60;

export const GRAVITY = (8 * PHYSICS.apex) / PHYSICS.airtime ** 2;
const LIFT = (4 * PHYSICS.apex) / PHYSICS.airtime;

export interface Obstacle {
  kind: ObstacleKind;
  /** Left edge in world cells. */
  x: number;
}

/** Collision box along x, measured from the mascot's left edge. */
export interface Hitbox {
  x: number;
  w: number;
}
const DEFAULT_HITBOX: Hitbox = { x: 4, w: 16 };

export interface RunState {
  hitbox: Hitbox;
  time: number;
  /** Animation clock: runs up to STRIDE_GAIN faster as the run speeds up. */
  stride: number;
  speed: number;
  distance: number;
  /** Height of the mascot's feet above the ground. */
  height: number;
  velocity: number;
  /** Seconds left on a buffered jump press. */
  buffered: number;
  obstacles: Obstacle[];
  /** Distance left until the next obstacle spawns. */
  untilNext: number;
  rng: number;
  over: boolean;
  jumps: number;
}

/** mulberry32: small, fast, good enough for obstacle spacing. */
function random(state: RunState): number {
  state.rng = (state.rng + 0x6d2b79f5) | 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function createRun(seed: number, hitbox: Hitbox = DEFAULT_HITBOX): RunState {
  return {
    hitbox,
    time: 0,
    stride: 0,
    speed: PHYSICS.startSpeed,
    distance: 0,
    height: 0,
    velocity: 0,
    buffered: 0,
    obstacles: [],
    untilNext: 140,
    rng: seed | 0,
    over: false,
    jumps: 0,
  };
}

export function score(state: RunState): number {
  return Math.floor(state.distance / PHYSICS.cellsPerPoint);
}

export function grounded(state: RunState): boolean {
  return state.height <= 0 && state.velocity <= 0;
}

/** Shortest safe gap: land, then have room for one more jump. */
function minimumGap(speed: number): number {
  return speed * (PHYSICS.airtime + 0.28);
}

function spawn(state: RunState, viewWidth: number) {
  // Taller obstacles appear only once the run has warmed up.
  const pool = state.speed < 90 ? OBSTACLES.filter((kind) => kind !== "rack") : OBSTACLES;
  const kind = pool[Math.floor(random(state) * pool.length)] ?? "docs";
  // Never closer than a safe gap to the last obstacle, even if the view just
  // shrank (leaving fullscreen) and the right edge moved in.
  const last = state.obstacles.at(-1);
  const after = last ? last.x + OBSTACLE_SPRITES[last.kind].w + minimumGap(state.speed) : 0;
  state.obstacles.push({ kind, x: Math.max(viewWidth + 4, after) });
  state.untilNext =
    OBSTACLE_SPRITES[kind].w + minimumGap(state.speed) + random(state) * state.speed * 0.9;
}

export function overlaps(state: RunState, obstacle: Obstacle): boolean {
  const sprite = OBSTACLE_SPRITES[obstacle.kind];
  const left = WORLD.mascotX + state.hitbox.x;
  const right = left + state.hitbox.w;
  const inX = right > obstacle.x + 1 && left < obstacle.x + sprite.w - 1;
  // Feet above the obstacle's top (less a forgiving cell) clear it.
  return inX && state.height < sprite.h - 1;
}

/** At top speed the legs move this much faster than at the start: enough to
 * feel the pace, well short of the ground's 2x, which would look frantic. */
export const STRIDE_GAIN = 0.3;

/** How fast the ride animation plays, relative to the start of a run. */
export function strideRate(speed: number): number {
  const { startSpeed, maxSpeed } = PHYSICS;
  const t = Math.min(1, Math.max(0, (speed - startSpeed) / (maxSpeed - startSpeed)));
  return 1 + STRIDE_GAIN * t;
}

/** Advance one fixed step. `jump` is true on the step a press arrives. */
export function step(state: RunState, jump: boolean, viewWidth: number): void {
  if (state.over) return;
  const dt = STEP;
  state.time += dt;
  state.speed = Math.min(PHYSICS.maxSpeed, state.speed + PHYSICS.acceleration * dt);
  state.stride += dt * strideRate(state.speed);
  const travel = state.speed * dt;
  state.distance += travel;

  if (jump) state.buffered = PHYSICS.jumpBuffer;
  else state.buffered = Math.max(0, state.buffered - dt);

  if (grounded(state) && state.buffered > 0) {
    state.velocity = LIFT;
    state.buffered = 0;
    state.jumps += 1;
  }
  state.velocity -= GRAVITY * dt;
  state.height = Math.max(0, state.height + state.velocity * dt);
  if (state.height === 0 && state.velocity < 0) state.velocity = 0;

  for (const obstacle of state.obstacles) obstacle.x -= travel;
  state.obstacles = state.obstacles.filter((o) => o.x + OBSTACLE_SPRITES[o.kind].w > -4);

  state.untilNext -= travel;
  if (state.untilNext <= 0) spawn(state, viewWidth);

  if (state.obstacles.some((obstacle) => overlaps(state, obstacle))) state.over = true;
}

/** The most points a run can earn in `seconds`, for the server's sanity check. */
export function maxScoreFor(seconds: number): number {
  const { startSpeed, acceleration, maxSpeed, cellsPerPoint } = PHYSICS;
  const rampTime = (maxSpeed - startSpeed) / acceleration;
  const ramp = Math.min(seconds, rampTime);
  const cruise = Math.max(0, seconds - rampTime);
  const distance = startSpeed * ramp + (acceleration * ramp ** 2) / 2 + maxSpeed * cruise;
  return Math.floor(distance / cellsPerPoint);
}

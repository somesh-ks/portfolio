import { describe, expect, test } from "bun:test";
import {
  createRunToken,
  isPlausible,
  normalizeInitials,
  readRunToken,
} from "@/lib/runner/leaderboard";
import {
  createRun,
  maxScoreFor,
  overlaps,
  PHYSICS,
  score,
  step,
  STEP,
  WORLD,
  type RunState,
} from "@/lib/runner/sim";
import { COSTUMES, mascotCells, OBSTACLE_SPRITES, POSES } from "@/lib/runner/sprites";

const VIEW = 200;
const ENV = { PORTFOLIO_COOKIE_SECRET: Buffer.alloc(32, 7).toString("base64") };

/** A bot that jumps at the latest moment that still clears the next obstacle. */
function playPerfectly(seed: number, seconds: number): RunState {
  const state = createRun(seed);
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps && !state.over; i += 1) {
    const ahead = state.obstacles.find((o) => o.x + OBSTACLE_SPRITES[o.kind].w > WORLD.mascotX);
    const lead = ahead ? ahead.x - (WORLD.mascotX + 20) : Infinity;
    step(state, lead < state.speed * 0.16 && lead > 0, VIEW);
  }
  return state;
}

describe("runner sim", () => {
  test("is deterministic for a seed and inputs", () => {
    const a = playPerfectly(42, 30);
    const b = playPerfectly(42, 30);
    expect(score(a)).toBe(score(b));
    expect(a.obstacles).toEqual(b.obstacles);
  });

  test("an idle runner crashes into the first obstacle", () => {
    const state = createRun(1);
    for (let i = 0; i < 60 * 20 && !state.over; i += 1) step(state, false, VIEW);
    expect(state.over).toBe(true);
  });

  test("every generated course is beatable for two minutes", () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const state = playPerfectly(seed, 120);
      if (state.over) throw new Error(`seed ${seed} died at ${score(state)}`);
    }
  });

  test("each obstacle can be cleared at start and top speed", () => {
    for (const speed of [PHYSICS.startSpeed, PHYSICS.maxSpeed]) {
      for (const kind of Object.keys(OBSTACLE_SPRITES) as (keyof typeof OBSTACLE_SPRITES)[]) {
        const cleared = Array.from({ length: 80 }, (_, lead) => {
          const state = createRun(0);
          state.speed = speed;
          state.untilNext = Infinity;
          state.obstacles = [{ kind, x: WORLD.mascotX + 20 + lead }];
          for (let i = 0; i < 120 && !state.over; i += 1) step(state, i === 0, VIEW);
          return !state.over;
        });
        expect(cleared.some(Boolean)).toBe(true);
      }
    }
  });

  test("a shrinking view never spawns obstacles closer than a safe gap", () => {
    const run = createRun(3);
    let previous = run.obstacles.length;
    for (let i = 0; i < 60 * 90 && !run.over; i += 1) {
      step(run, false, i % 300 < 150 ? 400 : 110);
      run.over = false;
      if (run.obstacles.length > previous) {
        const [a, b] = run.obstacles.slice(-2);
        if (a && b)
          expect(b.x - (a.x + OBSTACLE_SPRITES[a.kind].w)).toBeGreaterThan(run.speed * 0.9);
      }
      previous = run.obstacles.length;
    }
  });

  test("an obstacle under a standing mascot overlaps", () => {
    const state = createRun(0);
    expect(overlaps(state, { kind: "docs", x: WORLD.mascotX + 6 })).toBe(true);
  });

  test("the score ceiling is above anything a real run reaches", () => {
    const state = playPerfectly(7, 60);
    expect(score(state)).toBeLessThanOrEqual(maxScoreFor(60));
    expect(maxScoreFor(60)).toBeLessThan(score(state) * 1.1);
  });

  test("every costume renders inside a sane box", () => {
    for (const costume of COSTUMES) {
      for (const [x, y, w, h] of mascotCells(POSES.runA, costume)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(24);
        expect(y).toBeGreaterThanOrEqual(-8);
        expect(y + h).toBeLessThanOrEqual(16);
      }
    }
  });
});

describe("runner leaderboard", () => {
  test("initials are three letters and never blocked words", () => {
    expect(normalizeInitials("abc")).toBe("ABC");
    expect(normalizeInitials(" sks ")).toBe("SKS");
    expect(normalizeInitials("AB")).toBeNull();
    expect(normalizeInitials("A1C")).toBeNull();
    expect(normalizeInitials("KKK")).toBeNull();
    expect(normalizeInitials(42)).toBeNull();
  });

  test("run tokens verify, expire and reject tampering", () => {
    const now = 1_700_000_000_000;
    const token = createRunToken(ENV, now);
    expect(token).not.toBeNull();
    expect(readRunToken(token, ENV, now + 1000)?.issued).toBe(now);
    expect(readRunToken(token, ENV, now + 3 * 60 * 60 * 1000)).toBeNull();
    expect(readRunToken(`${token}x`, ENV, now)).toBeNull();
    const forged = token!.replace(`r1.${now}.`, `r1.${now - 600_000}.`);
    expect(readRunToken(forged, ENV, now)).toBeNull();
    expect(createRunToken({}, now)).toBeNull();
  });

  test("scores must be reachable in the time played", () => {
    expect(isPlausible(100, 20_000)).toBe(true);
    expect(isPlausible(maxScoreFor(10) * 3, 10_000)).toBe(false);
    expect(isPlausible(0, 10_000)).toBe(false);
    expect(isPlausible(1.5, 10_000)).toBe(false);
  });
});

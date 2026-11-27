import { describe, expect, test } from "bun:test";
import {
  createRunToken,
  isPlausible,
  normalizeName,
  parseScore,
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
  STRIDE_GAIN,
  strideRate,
  WORLD,
  type RunState,
} from "@/lib/runner/sim";
import { buildSprite, COSTUMES, walkSprite, type RawSprite } from "@/lib/runner/claude-sprites";
import rides from "../../public/runner/rides.json";
import { OBSTACLE_SPRITES } from "@/lib/runner/sprites";

const sprite = (costume: (typeof COSTUMES)[number]) =>
  buildSprite(
    costume === "walk" ? walkSprite : (rides as Record<string, RawSprite>)[costume]!,
    costume,
  );

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

  test("the CSS walk cycle matches the five-frame walk loop", () => {
    expect(sprite("walk").frames).toHaveLength(5);
  });

  test("every costume decodes, loops and can clear every obstacle", () => {
    for (const costume of COSTUMES) {
      const built = sprite(costume);
      expect(built.frames.length).toBeGreaterThan(1);
      expect(built.hitbox.w).toBeGreaterThan(8);
      expect(built.hitbox.w).toBeLessThanOrEqual(16);
      for (const kind of Object.keys(OBSTACLE_SPRITES) as (keyof typeof OBSTACLE_SPRITES)[]) {
        const cleared = Array.from({ length: 80 }, (_, lead) => {
          const state = createRun(0, built.hitbox);
          state.untilNext = Infinity;
          state.obstacles = [{ kind, x: WORLD.mascotX + built.hitbox.x + built.hitbox.w + lead }];
          for (let i = 0; i < 120 && !state.over; i += 1) step(state, i === 0, VIEW);
          return !state.over;
        });
        expect(cleared.some(Boolean)).toBe(true);
      }
    }
  });
});

describe("runner leaderboard", () => {
  test("first names are short, letter-only and not offensive", () => {
    expect(normalizeName(" Somesh ")).toBe("Somesh");
    expect(normalizeName("Anne-Marie")).toBe("Anne-Marie");
    expect(normalizeName("Zoë")).toBe("Zoë");
    expect(normalizeName("Mary  Jo")).toBe("Mary Jo");
    expect(normalizeName("")).toBeNull();
    expect(normalizeName("R2D2")).toBeNull();
    expect(normalizeName("Averyverylongname")).toBeNull();
    expect(normalizeName("<script>")).toBeNull();
    expect(normalizeName("ShitHead")).toBeNull();
    expect(normalizeName(42)).toBeNull();
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

describe("stride", () => {
  test("legs speed up with the run, a little, and stop at top speed", () => {
    expect(strideRate(PHYSICS.startSpeed)).toBe(1);
    expect(strideRate(PHYSICS.maxSpeed)).toBeCloseTo(1 + STRIDE_GAIN);
    expect(strideRate(PHYSICS.maxSpeed * 2)).toBeCloseTo(1 + STRIDE_GAIN);
    expect(strideRate(110)).toBeGreaterThan(1);
    expect(strideRate(110)).toBeLessThan(1 + STRIDE_GAIN);
  });

  test("the animation clock runs ahead of real time as speed builds", () => {
    const state = createRun(1);
    for (let i = 0; i < 600; i++) step(state, false, 10_000);
    expect(state.stride).toBeGreaterThan(state.time);
    expect(state.stride).toBeLessThan(state.time * (1 + STRIDE_GAIN));
  });
});

describe("score lookup", () => {
  test("only scores a run could reach place on the board", () => {
    expect(parseScore("42")).toBe(42);
    expect(parseScore("0")).toBeNull();
    expect(parseScore("-3")).toBeNull();
    expect(parseScore("4.5")).toBeNull();
    expect(parseScore("9999999")).toBeNull();
    expect(parseScore(null)).toBeNull();
  });
});

describe("eyes", () => {
  const dark = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) < 64;
  };
  test.each(["walk", "scooter", "bike"] as const)(
    "%s: both eyes level, two pixels wide, one in from the face's edge",
    (costume) => {
      for (const frame of sprite(costume).frames) {
        const eyes = frame.filter(([, , , , colour]) => dark(colour));
        const top = Math.min(...eyes.map(([, y]) => y));
        for (const row of [top, top + 1]) {
          const cells = eyes.filter(([, y]) => y === row);
          expect(cells.map(([, , w]) => w)).toEqual([2, 2]);
          const [, right] = cells.sort((a, b) => a[0] - b[0]);
          const after = frame.some(
            ([x, y, w]) => y === row && x <= right![0] + 2 && x + w > right![0] + 2,
          );
          expect(after).toBe(true);
        }
      }
    },
  );
});

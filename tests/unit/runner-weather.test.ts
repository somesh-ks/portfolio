import { afterEach, describe, expect, mock, test } from "bun:test";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/runner/weather/route";
import {
  RESKINS,
  accessoryFor,
  dress,
  findFace,
  makeParticles,
  SPLASH,
  stepParticles,
  stepSway,
  swayRow,
} from "@/lib/runner/scene";
import { buildSprite, COSTUMES, walkSprite, type RawSprite } from "@/lib/runner/claude-sprites";
import { createRun, GRAVITY, step, STEP } from "@/lib/runner/sim";
import rides from "../../public/runner/rides.json";
import { OBSTACLE_SPRITES, type Cell, type ObstacleKind } from "@/lib/runner/sprites";
import { localNight, roundCoord, skyFromCode, skyFromCurrent } from "@/lib/runner/weather";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("weather mapping", () => {
  test("WMO codes map to skies", () => {
    expect([0, 1].map(skyFromCode)).toEqual(["clear", "clear"]);
    expect([2, 3].map(skyFromCode)).toEqual(["cloudy", "cloudy"]);
    expect([45, 48].map(skyFromCode)).toEqual(["fog", "fog"]);
    expect([51, 61, 67, 80, 95, 99].map(skyFromCode)).toEqual(Array(6).fill("rain"));
    expect([71, 75, 77, 85, 86].map(skyFromCode)).toEqual(Array(5).fill("snow"));
  });

  test("a trace of drizzle is a grey sky, not rain", () => {
    // Stockholm, 2026-11-25: code 51 with 0.1 mm while the streets stayed dry.
    expect(skyFromCurrent({ weather_code: 51, precipitation: 0.1, snowfall: 0 })).toBe("cloudy");
    expect(skyFromCurrent({ weather_code: 61, precipitation: 0.4, snowfall: 0 })).toBe("rain");
    expect(skyFromCurrent({ weather_code: 95, precipitation: 0 })).toBe("cloudy");
    expect(skyFromCurrent({ weather_code: 71, precipitation: 0.1, snowfall: 0.07 })).toBe("snow");
    expect(skyFromCurrent({ weather_code: 61, precipitation: 0.5, snowfall: 0.2 })).toBe("snow");
    expect(skyFromCurrent({ weather_code: 3, precipitation: 0.3 })).toBe("cloudy");
    expect(skyFromCurrent({ weather_code: 71, precipitation: 0, snowfall: 0.01 })).toBe("snow");
    expect(skyFromCurrent({ weather_code: 61, precipitation: 0.3, snowfall: 0.01 })).toBe("rain");
    expect(skyFromCurrent({ weather_code: 45, precipitation: 0 })).toBe("fog");
    expect(skyFromCurrent({})).toBeNull();
  });

  test("coordinates round to about 11 km", () => {
    expect(roundCoord(48.13743)).toBe(48.1);
    expect(roundCoord(-122.4194)).toBe(-122.4);
  });

  test("night by the local clock", () => {
    expect(localNight(new Date(2026, 0, 1, 23))).toBe(true);
    expect(localNight(new Date(2026, 0, 1, 12))).toBe(false);
  });
});

describe("weather route", () => {
  test("no geo headers: null, never cached, no upstream call", async () => {
    const spy = mock(() => Promise.resolve(new Response("{}")));
    globalThis.fetch = spy as unknown as typeof fetch;
    const response = await GET(new NextRequest("http://localhost/api/runner/weather"));
    expect(await response.json()).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(spy).not.toHaveBeenCalled();
  });

  test("returns only the sky, asks with rounded coordinates", async () => {
    let asked = "";
    globalThis.fetch = (async (url: URL) => {
      asked = String(url);
      return Response.json({ current: { weather_code: 73, is_day: 0, temperature_2m: -2.4 } });
    }) as unknown as typeof fetch;
    const response = await GET(
      new NextRequest("http://localhost/api/runner/weather", {
        headers: { "x-vercel-ip-latitude": "48.13743", "x-vercel-ip-longitude": "11.57549" },
      }),
    );
    expect(await response.json()).toEqual({ sky: "snow", night: true });
    expect(response.headers.get("cache-control")).toBe("private, max-age=900");
    expect(asked).toContain("latitude=48.1");
    expect(asked).toContain("longitude=11.6");
  });

  test("upstream failure falls back", async () => {
    globalThis.fetch = (async () =>
      new Response("down", { status: 503 })) as unknown as typeof fetch;
    const response = await GET(
      new NextRequest("http://localhost/api/runner/weather", {
        headers: { "x-vercel-ip-latitude": "1", "x-vercel-ip-longitude": "2" },
      }),
    );
    expect(await response.json()).toBeNull();
  });
});

describe("scene", () => {
  test("reskins keep the size of the obstacle they replace", () => {
    for (const skins of Object.values(RESKINS))
      for (const [kind, skin] of Object.entries(skins ?? {})) {
        const original = OBSTACLE_SPRITES[kind as ObstacleKind];
        expect([skin.w, skin.h]).toEqual([original.w, original.h]);
      }
  });

  test("particles stay inside the sky", () => {
    const particles = makeParticles();
    for (let i = 0; i < 600; i += 1) stepParticles(particles, "rain", 1 / 60, 56);
    for (const { x, y } of particles) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(56);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(200);
    }
  });
});

describe("accessories", () => {
  test("every frame of every ride has a face to dress", () => {
    for (const costume of COSTUMES) {
      const raw = costume === "walk" ? walkSprite : (rides as Record<string, RawSprite>)[costume]!;
      const sprite = buildSprite(raw, costume);
      for (const frame of [sprite.idle, ...sprite.frames]) {
        const face = findFace(frame);
        expect(face, costume).not.toBeNull();
        expect(face!.right - face!.left, costume).toBeGreaterThanOrEqual(9);
        // No wheel or trim taken for an eye: eyes share (about) one row.
        const rows = face!.eyes.map(([, y]) => y);
        expect(Math.max(...rows) - Math.min(...rows), costume).toBeLessThanOrEqual(2);
      }
    }
  });

  test("weather picks the accessory", () => {
    expect(accessoryFor({ sky: "rain", night: true })).toBe("umbrella");
    expect(accessoryFor({ sky: "snow", night: false })).toBe("beanie");
    expect(accessoryFor({ sky: "clear", night: false })).toBeNull();
    expect(accessoryFor({ sky: "clear", night: true })).toBe("nightcap");
    expect(accessoryFor({ sky: "cloudy", night: false })).toBeNull();
  });
});

describe("no place or temperature leaves the server", () => {
  test("the route answers with the sky alone, even with city headers", async () => {
    let asked = "";
    globalThis.fetch = (async (url: URL) => {
      asked = String(url);
      return Response.json({ current: { weather_code: 0, is_day: 1, temperature_2m: 70.4 } });
    }) as unknown as typeof fetch;
    const response = await GET(
      new NextRequest("http://localhost/api/runner/weather", {
        headers: {
          "x-vercel-ip-latitude": "40.7",
          "x-vercel-ip-longitude": "-74",
          "x-vercel-ip-country": "US",
          "x-vercel-ip-city": "New%20York",
        },
      }),
    );
    expect(await response.json()).toEqual({ sky: "clear", night: false });
    expect(asked).not.toContain("temperature");
  });
});

const highest = (cells: readonly Cell[]) => Math.min(...cells.map(([, y]) => y));

const touching = (a: Cell, b: Cell) =>
  a[0] <= b[0] + b[2] && b[0] <= a[0] + a[2] && a[1] <= b[1] + b[3] && b[1] <= a[1] + a[3];

/** Every cell joins the others: nothing floats free of the hat. */
const connected = (cells: readonly Cell[]) => {
  const reached = new Set([0]);
  for (let grew = true; grew;) {
    grew = false;
    cells.forEach((cell, index) => {
      if (reached.has(index)) return;
      if ([...reached].some((other) => touching(cell, cells[other]!))) {
        reached.add(index);
        grew = true;
      }
    });
  }
  return reached.size === cells.length;
};

describe("jump props", () => {
  const face = { eyes: [[9, -15] as const], top: -17, left: 4, right: 19 };

  test("a hat's band never leaves the head", () => {
    for (const hat of ["beanie", "nightcap"] as const)
      for (const sway of [-1, 0, 1] as const) {
        const cells = dress(face, hat, "walk", sway);
        expect(Math.max(...cells.map(([, y, , h]) => y + h))).toBe(face.top);
        expect(connected(cells)).toBe(true);
      }
  });

  test("loose cloth sags on take-off and landing and floats in the air", () => {
    const run = createRun(1);
    const sway = { offset: 0, speed: 0 };
    const rows: number[] = [];
    for (let tick = 0; tick < 70; tick += 1) {
      const before = run.velocity;
      step(run, tick === 5, 600);
      stepSway(sway, before, run.velocity, STEP, GRAVITY);
      rows.push(swayRow(sway));
    }
    expect(rows.slice(0, 5).every((row) => row === 0)).toBe(true);
    expect(rows.slice(5, 9)).toContain(1);
    expect(rows.slice(15, 40).every((row) => row === -1)).toBe(true);
    expect(rows.slice(40, 52)).toContain(1);
    expect(rows.slice(-10).every((row) => row === 0)).toBe(true);
  });

  test("the umbrella is rigid, reaches the head and stays on screen", () => {
    for (const headroom of [4, 7, 9, 30]) {
      const cells = dress(face, "umbrella", "walk", 1, headroom);
      expect(cells).toEqual(dress(face, "umbrella", "walk", -1, headroom));
      const shaft = cells.at(-1)!;
      expect(shaft[1] + shaft[3]).toBe(face.top);
      if (headroom >= 7) expect(highest(cells) - face.top).toBeGreaterThanOrEqual(-headroom);
    }
  });
});

describe("rain", () => {
  test("a drop that lands leaves a splash, then the splash fades", () => {
    const particles = makeParticles();
    const drop = particles[0]!;
    drop.y = 55.5;
    stepParticles(particles, "rain", 1 / 60, 56);
    expect(drop.splash).toBe(0);
    for (let i = 0; i < 12; i += 1) stepParticles(particles, "rain", 1 / 60, 56);
    expect(drop.splash).toBeGreaterThan(SPLASH);
  });
});

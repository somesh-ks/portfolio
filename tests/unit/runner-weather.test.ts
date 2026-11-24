import { afterEach, describe, expect, mock, test } from "bun:test";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/runner/weather/route";
import { RESKINS, accessoryFor, findFace, makeParticles, stepParticles } from "@/lib/runner/scene";
import { buildSprite, COSTUMES, walkSprite, type RawSprite } from "@/lib/runner/claude-sprites";
import rides from "../../public/runner/rides.json";
import { OBSTACLE_SPRITES, type ObstacleKind } from "@/lib/runner/sprites";
import { localNight, roundCoord, skyFromCode, weatherLabel } from "@/lib/runner/weather";

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
    expect(await response.json()).toEqual({ sky: "snow", night: true, temp: -2, unit: "C" });
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
      }
    }
  });

  test("weather picks the accessory", () => {
    expect(accessoryFor({ sky: "rain", night: true, temp: null })).toBe("umbrella");
    expect(accessoryFor({ sky: "snow", night: false, temp: null })).toBe("beanie");
    expect(accessoryFor({ sky: "clear", night: false, temp: null })).toBe("shades");
    expect(accessoryFor({ sky: "clear", night: true, temp: null })).toBe("nightcap");
    expect(accessoryFor({ sky: "cloudy", night: false, temp: null })).toBeNull();
  });
});

describe("weather label", () => {
  test("condition and temperature, no city", () => {
    expect(weatherLabel({ sky: "rain", night: false, temp: 12, unit: "C", city: "Munich" })).toBe(
      "LOCAL WEATHER · RAIN · 12°C",
    );
    expect(weatherLabel({ sky: "snow", night: true, temp: 27, unit: "F" })).toBe(
      "LOCAL WEATHER · SNOW · 27°F",
    );
  });

  test("no temperature, no label", () => {
    expect(weatherLabel({ sky: "cloudy", night: false, temp: null })).toBeNull();
  });

  test("US visitors get Fahrenheit", async () => {
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
    expect(await response.json()).toEqual({ sky: "clear", night: false, temp: 70, unit: "F" });
    expect(asked).toContain("temperature_unit=fahrenheit");
  });
});

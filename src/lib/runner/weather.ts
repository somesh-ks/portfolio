/**
 * Visitor weather for the runner's scene. The server turns Vercel's rough
 * geo headers into a sky; only the sky leaves the server, never a place.
 */

const SKIES = ["clear", "cloudy", "fog", "rain", "snow"] as const;
export type Sky = (typeof SKIES)[number];

export interface Weather {
  sky: Sky;
  night: boolean;
  /** Whole degrees Celsius, or null when unknown. */
  temp: number | null;
}

/** WMO weather interpretation codes, as Open-Meteo reports them. */
export function skyFromCode(code: number): Sky {
  if (code <= 1) return "clear";
  if (code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 51) return "rain";
  return "cloudy";
}

/** About 11 km: enough for weather, too coarse to place anyone. */
export function roundCoord(value: number): number {
  return Math.round(value * 10) / 10;
}

export function isSky(value: unknown): value is Sky {
  return typeof value === "string" && (SKIES as readonly string[]).includes(value);
}

/** Night by the visitor's own clock, before (or without) the server's answer. */
export function localNight(date = new Date()): boolean {
  const hour = date.getHours();
  return hour < 6 || hour >= 20;
}

interface OpenMeteoCurrent {
  current?: { weather_code?: number; is_day?: number; temperature_2m?: number };
}

/** One rounded cell asks Open-Meteo at most every 15 minutes. */
export async function fetchWeather(lat: number, lon: number): Promise<Weather | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(roundCoord(lat)));
  url.searchParams.set("longitude", String(roundCoord(lon)));
  url.searchParams.set("current", "weather_code,is_day,temperature_2m");
  try {
    const response = await fetch(url, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return null;
    const { current } = (await response.json()) as OpenMeteoCurrent;
    if (typeof current?.weather_code !== "number") return null;
    return {
      sky: skyFromCode(current.weather_code),
      night: current.is_day === 0,
      temp: typeof current.temperature_2m === "number" ? Math.round(current.temperature_2m) : null,
    };
  } catch {
    return null;
  }
}

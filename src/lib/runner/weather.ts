/**
 * Visitor weather for the runner's scene. The server turns Vercel's rough
 * geo headers into a sky; only the sky leaves the server, never a place.
 */

const SKIES = ["clear", "cloudy", "fog", "rain", "snow"] as const;
export type Sky = (typeof SKIES)[number];

export interface Weather {
  sky: Sky;
  night: boolean;
  /** Whole degrees in `unit`, or null when unknown. */
  temp: number | null;
  unit?: "C" | "F";
  /** The visitor's city, only while SHOW_CITY is on. */
  city?: string | null;
}

/** Off: IP cities are often wrong (VPNs, carriers) and feel creepy on a
 * screen-share. The condition and temperature can be checked out the window. */
export const SHOW_CITY = false;

/** How each sky reads in a sentence; a clear night isn't sunny. */
const FEELS: Record<Sky, string> = {
  clear: "sunny",
  cloudy: "cloudy",
  fog: "foggy",
  rain: "rainy",
  snow: "snowy",
};

/** The caption under the play prompt, e.g. `RAINY, 12°C`. */
export function weatherLabel(weather: Weather): string | null {
  if (weather.temp === null) return null;
  const feel = weather.sky === "clear" && weather.night ? "clear" : FEELS[weather.sky];
  const parts = [feel, `${weather.temp}°${weather.unit ?? "C"}`];
  if (SHOW_CITY && weather.city) parts.unshift(weather.city);
  return parts.join(", ").toUpperCase();
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

/** Rain you'd notice: 0.2 mm in 15 minutes, about 0.8 mm an hour. Below it,
 * models report a drizzle code (51) for a trace nobody sees out the window. */
const WET = 0.2;
/** Snow shows at lighter rates than rain does. */
const FLURRY = 0.1;

interface Current {
  weather_code?: number;
  is_day?: number;
  temperature_2m?: number;
  /** Millimetres in the last 15 minutes. */
  precipitation?: number;
  /** Centimetres in the last 15 minutes. */
  snowfall?: number;
}

/** The sky from what is falling, not only from the code: a wet code with a
 * trace of precipitation is just a grey sky. */
export function skyFromCurrent(current: Current): Sky | null {
  const code = current.weather_code;
  if (typeof code !== "number") return null;
  const sky = skyFromCode(code);
  if (sky !== "rain" && sky !== "snow") return sky;
  const amount = current.precipitation;
  if (typeof amount !== "number") return sky;
  const snowfall = current.snowfall ?? 0;
  // Light snow can round to 0.0 mm and still be visible; a rain code needs
  // real snow in the mix (about 0.1 mm of water) before it reads as snow.
  if (sky === "snow" && (snowfall > 0 || amount >= FLURRY)) return "snow";
  if (snowfall >= 0.07 && amount >= FLURRY) return "snow";
  if (amount >= WET) return "rain";
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
  current?: Current;
}

/** One rounded cell asks Open-Meteo at most every 15 minutes. */
export async function fetchWeather(
  lat: number,
  lon: number,
  unit: "C" | "F" = "C",
): Promise<Weather | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(roundCoord(lat)));
  url.searchParams.set("longitude", String(roundCoord(lon)));
  url.searchParams.set("current", "weather_code,is_day,temperature_2m,precipitation,snowfall");
  if (unit === "F") url.searchParams.set("temperature_unit", "fahrenheit");
  try {
    const response = await fetch(url, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return null;
    const { current } = (await response.json()) as OpenMeteoCurrent;
    const sky = current ? skyFromCurrent(current) : null;
    if (!current || !sky) return null;
    return {
      sky,
      night: current.is_day === 0,
      temp: typeof current.temperature_2m === "number" ? Math.round(current.temperature_2m) : null,
      unit,
    };
  } catch {
    return null;
  }
}

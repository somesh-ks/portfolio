import { NextResponse, type NextRequest } from "next/server";
import { fetchWeather, SHOW_CITY } from "@/lib/runner/weather";

export const dynamic = "force-dynamic";

/** The visitor's sky. Private: the answer depends on where they are, so no
 * shared cache may hold it. A miss isn't cached at all. */
export async function GET(request: NextRequest) {
  const lat = Number.parseFloat(request.headers.get("x-vercel-ip-latitude") ?? "");
  const lon = Number.parseFloat(request.headers.get("x-vercel-ip-longitude") ?? "");
  const unit = request.headers.get("x-vercel-ip-country") === "US" ? "F" : "C";
  const weather =
    Number.isFinite(lat) && Number.isFinite(lon) ? await fetchWeather(lat, lon, unit) : null;
  if (weather && SHOW_CITY) weather.city = cityFrom(request.headers.get("x-vercel-ip-city"));
  if (!weather) return NextResponse.json(null, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(weather, { headers: { "Cache-Control": "private, max-age=900" } });
}

/** Vercel sends the city URL-encoded; a bad encoding just drops it. */
function cityFrom(header: string | null): string | null {
  if (!header) return null;
  try {
    return decodeURIComponent(header).slice(0, 40);
  } catch {
    return null;
  }
}

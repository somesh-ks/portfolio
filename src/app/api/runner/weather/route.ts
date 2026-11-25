import { NextResponse, type NextRequest } from "next/server";
import { fetchWeather } from "@/lib/runner/weather";

/** The visitor's sky. Private: the answer depends on where they are, so no
 * shared cache may hold it. A miss isn't cached at all. */
export async function GET(request: NextRequest) {
  const lat = Number.parseFloat(request.headers.get("x-vercel-ip-latitude") ?? "");
  const lon = Number.parseFloat(request.headers.get("x-vercel-ip-longitude") ?? "");
  const weather =
    Number.isFinite(lat) && Number.isFinite(lon) ? await fetchWeather(lat, lon) : null;
  if (!weather) return NextResponse.json(null, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(weather, { headers: { "Cache-Control": "private, max-age=900" } });
}

import { NextResponse, type NextRequest } from "next/server";
import {
  createRunToken,
  isLeaderboardEnabled,
  submitScore,
  topScores,
} from "@/lib/runner/leaderboard";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** Top scores. `enabled: false` tells the game to keep only a local best. */
export async function GET() {
  if (!isLeaderboardEnabled()) return NextResponse.json({ enabled: false, top: [] });
  try {
    return NextResponse.json(
      { enabled: true, top: await topScores() },
      { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } },
    );
  } catch {
    return NextResponse.json({ enabled: false, top: [] }, { headers: NO_STORE });
  }
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

/** `{ action: "start" }` issues a run token; `{ action: "score", ... }` submits. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request) || !isLeaderboardEnabled())
    return NextResponse.json({ ok: false }, { status: 403, headers: NO_STORE });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (body?.action === "start")
    return NextResponse.json({ ok: true, token: createRunToken() }, { headers: NO_STORE });
  if (body?.action !== "score")
    return NextResponse.json({ ok: false }, { status: 400, headers: NO_STORE });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  try {
    const result = await submitScore(
      { token: body.token, initials: body.initials, score: body.score },
      ip,
    );
    const status = result.ok ? 200 : result.reason === "limited" ? 429 : 400;
    return NextResponse.json(result, { status, headers: NO_STORE });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: NO_STORE });
  }
}

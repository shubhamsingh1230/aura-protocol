import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Call this DAILY (not just weekly) — it's cheap and idempotent:
 *  - refill_rest_tokens() only touches profiles whose weekly reset date has
 *    actually passed, so calling it every day is safe.
 *  - expire_stale_streaks() zeros anyone whose streak has gone quiet, so
 *    the leaderboard doesn't keep showing a broken streak as still alive
 *    just because the user hasn't logged back in yet.
 *
 * Vercel Cron example (vercel.json):
 * { "crons": [{ "path": "/api/cron/reset", "schedule": "0 0 * * *" }] }
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { error: tokenError } = await supabase.rpc("refill_rest_tokens");
  if (tokenError) {
    return NextResponse.json({ error: tokenError.message }, { status: 500 });
  }

  const { error: streakError } = await supabase.rpc("expire_stale_streaks");
  if (streakError) {
    return NextResponse.json({ error: streakError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString() });
}

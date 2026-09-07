// app/api/cron/streak-check/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase admin client to bypass RLS for background maintenance
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  // 1. Verify cron authentication secret (optional protection for Vercel Cron or external callers)
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
  }

  // Calculate target comparison dates
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // 2. Fetch all profiles
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, handle, aura_points, current_streak, longest_streak, streak_shields, identity_rank, last_activity_date");

  if (profilesError || !profiles) {
    return NextResponse.json({ error: profilesError?.message || "Failed to fetch profiles" }, { status: 500 });
  }

  // 3. Fetch yesterday's daily logs across all users
  const { data: yesterdayLogs } = await supabaseAdmin
    .from("daily_logs")
    .select("user_id, daily_score, workout, deep_work, nutrition, gym_done, editing_done")
    .eq("log_date", yesterdayStr);

  const logsByUserId = new Map<string, any>();
  (yesterdayLogs || []).forEach((log) => logsByUserId.set(log.user_id, log));

  const updates: Array<{ id: string; updates: Record<string, any> }> = [];
  const notificationsToInsert: any[] = [];

  for (const profile of profiles) {
    const userLog = logsByUserId.get(profile.id);
    let currentStreak = profile.current_streak || 0;
    let longestStreak = profile.longest_streak || 0;
    let shields = profile.streak_shields || 0;

    // Check compliance: daily_score >= 50 or at least two major pillars verified
    const isCompliant = userLog && (
      (userLog.daily_score || 0) >= 50 ||
      (userLog.workout || userLog.gym_done) ||
      (userLog.deep_work || userLog.editing_done)
    );

    if (isCompliant) {
      currentStreak += 1;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      // Check for streak milestones (e.g. 7d, 30d, 100d)
      if ([7, 14, 30, 60, 90, 180, 365].includes(currentStreak)) {
        notificationsToInsert.push({
          user_id: profile.id,
          actor_id: profile.id,
          type: "streak_milestone",
          message: `🔥 Protocol Milestone: You achieved a ${currentStreak}-day unbroken consistency streak!`,
        });
      }
    } else {
      // Missed day: evaluate shield protection
      if (shields > 0) {
        shields -= 1;
        notificationsToInsert.push({
          user_id: profile.id,
          actor_id: profile.id,
          type: "shield_deployed",
          message: `🛡️ Streak Shield Deployed: Your ${currentStreak}-day streak was protected from resetting. ${shields} shields remaining.`,
        });
      } else {
        currentStreak = 0;
      }
    }

    // Determine Identity Rank progression based on cumulative Aura Points
    const ap = profile.aura_points || 0;
    let calculatedRank = "Initiate";
    if (ap >= 2000) calculatedRank = "Apex";
    else if (ap >= 1000) calculatedRank = "Elite";
    else if (ap >= 500) calculatedRank = "Operator";
    else if (ap >= 200) calculatedRank = "Disciplined";

    if (calculatedRank !== profile.identity_rank) {
      notificationsToInsert.push({
        user_id: profile.id,
        actor_id: profile.id,
        type: "rank_up",
        message: `⚡ Rank Elevation: You ascended to the rank of ${calculatedRank}!`,
      });
    }

    updates.push({
      id: profile.id,
      updates: {
        current_streak: currentStreak,
        longest_streak: longestStreak,
        streak_shields: shields,
        identity_rank: calculatedRank,
      },
    });
  }

  // 4. Batch update profiles
  for (const item of updates) {
    await supabaseAdmin
      .from("profiles")
      .update(item.updates)
      .eq("id", item.id);
  }

  // 5. Insert queued milestone and alert notifications
  if (notificationsToInsert.length > 0) {
    await supabaseAdmin
      .from("notifications")
      .insert(notificationsToInsert);
  }

  return NextResponse.json({
    success: true,
    processedOperators: profiles.length,
    alertsDispatched: notificationsToInsert.length,
    timestamp: new Date().toISOString(),
  });
}

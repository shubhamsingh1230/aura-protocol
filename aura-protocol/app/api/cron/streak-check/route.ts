// app/api/cron/streak-check/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase admin client to bypass RLS for background maintenance sweeps
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function calculateIdentityRank(ap: number): string {
  if (ap >= 2000) return "Apex";
  if (ap >= 1000) return "Elite";
  if (ap >= 500) return "Operator";
  if (ap >= 200) return "Disciplined";
  return "Initiate";
}

export async function GET(request: Request) {
  // 1. Verify Vercel Cron authorization header if CRON_SECRET is defined
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
  }

  // 2. Audit the prior calendar day (YYYY-MM-DD)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  try {
    // 3. Fetch all operator profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, handle, aura_points, current_streak, longest_streak, streak_shields, identity_rank");

    if (profilesError || !profiles) {
      return NextResponse.json(
        { error: profilesError?.message || "Failed to fetch profiles" },
        { status: 500 }
      );
    }

    // 4. Fetch yesterday's daily logs across all operators
    const { data: yesterdayLogs, error: logsError } = await supabaseAdmin
      .from("daily_logs")
      .select("user_id, daily_score, workout, deep_work, nutrition, gym_done, editing_done, meals_logged")
      .eq("log_date", yesterdayStr);

    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }

    const logsByUserId = new Map<string, any>();
    (yesterdayLogs || []).forEach((log) => logsByUserId.set(log.user_id, log));

    const notificationsToInsert: any[] = [];
    const updates: Array<{ id: string; payload: Record<string, any> }> = [];

    const stats = {
      streaksIncremented: 0,
      shieldsDeployed: 0,
      streaksReset: 0,
      ranksElevated: 0,
    };

    // 5. Audit compliance and calculate dividends
    for (const profile of profiles) {
      const userLog = logsByUserId.get(profile.id);
      let currentStreak = profile.current_streak || 0;
      let longestStreak = profile.longest_streak || 0;
      let shields = profile.streak_shields || 0;
      let ap = profile.aura_points || 0;

      // Evaluation: daily_score >= 50, or completion across primary verified pillars
      const isCompliant = Boolean(
        userLog &&
          ((userLog.daily_score || 0) >= 50 ||
            (userLog.workout || userLog.gym_done) ||
            (userLog.deep_work || userLog.editing_done) ||
            (userLog.nutrition || (userLog.meals_logged || 0) >= 3))
      );

      if (isCompliant) {
        currentStreak += 1;
        ap += 15; // +15 AP daily completion dividend
        stats.streaksIncremented++;

        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }

        // Streak milestone checks (e.g. 7d, 14d, 30d, 60d, 90d, 100d, 365d)
        if ([7, 14, 30, 60, 90, 100, 180, 365].includes(currentStreak)) {
          ap += 50; // +50 AP milestone bonus
          notificationsToInsert.push({
            user_id: profile.id,
            actor_id: profile.id,
            type: "streak_milestone",
            message: `🔥 Protocol Milestone: ${currentStreak}-Day unbroken streak achieved! +50 AP credited to your dossier.`,
            is_read: false,
          });
        }
      } else {
        // Missed day: evaluate shield protection
        if (shields > 0) {
          shields -= 1;
          stats.shieldsDeployed++;
          notificationsToInsert.push({
            user_id: profile.id,
            actor_id: profile.id,
            type: "shield_deployed",
            message: `🛡️ Streak Shield Deployed: Your ${currentStreak}-day streak was defended from resetting. ${shields} shields remaining in reserve.`,
            is_read: false,
          });
        } else {
          if (currentStreak > 0) {
            stats.streaksReset++;
            notificationsToInsert.push({
              user_id: profile.id,
              actor_id: profile.id,
              type: "protocol_breach",
              message: `⚠️ Protocol Breach: Streak reset to 0 due to missed gauntlet verification. Log an autopsy to diagnose the breakdown.`,
              is_read: false,
            });
          }
          currentStreak = 0;
        }
      }

      // Rank progression verification based on current AP
      const calculatedRank = calculateIdentityRank(ap);
      if (calculatedRank !== profile.identity_rank) {
        stats.ranksElevated++;
        notificationsToInsert.push({
          user_id: profile.id,
          actor_id: profile.id,
          type: "rank_up",
          message: `🎖️ Tier Elevation: You have ascended to the rank of ${calculatedRank}!`,
          is_read: false,
        });
      }

      updates.push({
        id: profile.id,
        payload: {
          current_streak: currentStreak,
          longest_streak: longestStreak,
          streak_shields: shields,
          aura_points: ap,
          identity_rank: calculatedRank,
          last_activity_date: yesterdayStr,
        },
      });
    }

    // 6. Execute profile updates
    await Promise.all(
      updates.map((item) =>
        supabaseAdmin
          .from("profiles")
          .update(item.payload)
          .eq("id", item.id)
      )
    );

    // 7. Batch insert queued alert transmissions
    if (notificationsToInsert.length > 0) {
      await supabaseAdmin
        .from("notifications")
        .insert(notificationsToInsert);
    }

    return NextResponse.json({
      success: true,
      sweepDate: yesterdayStr,
      processedOperators: profiles.length,
      alertsDispatched: notificationsToInsert.length,
      summary: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Streak cron sweeping exception:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during streak sweep" },
      { status: 500 }
    );
  }
}

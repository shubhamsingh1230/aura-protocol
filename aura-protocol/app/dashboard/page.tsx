// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckInClient from "@/components/dashboard/CheckInClient";

// Deterministic daily anti-cheat gesture
function getDailyGesture(): string {
  const gestures = [
    "✌️ Two Fingers (Peace Sign)",
    "👍 Thumbs Up near your screen/weights",
    "👌 OK Sign clearly visible",
    "🖐️ Open Palm facing the lens",
    "🤙 Shaka Sign in the frame",
    "☝️ Index Finger pointing up",
  ];
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return gestures[dayOfYear % gestures.length];
}

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0m";
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

// Subscription Lifecycle Calculator (7 Days Active -> 2 Days Grace -> Locked)
function getProtocolStatus(trialEndsAt: string | null, subscriptionStatus: string | null): "active" | "grace" | "locked" {
  // If status is explicitly trialing or active, or date is missing, treat as active
  if (subscriptionStatus === "trialing" || subscriptionStatus === "active" || !trialEndsAt) {
    return "active";
  }

  const now = new Date();
  const expiry = new Date(trialEndsAt);
  
  // 2-day grace period window after the initial 7 days
  const gracePeriodEnd = new Date(expiry);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 2);

  if (now <= expiry) {
    return "active"; // Days 1-7: Fully active, zero interruptions
  } else if (now > expiry && now <= gracePeriodEnd) {
    return "grace";  // Days 8-9: Soft warning banner, bypassable
  } else {
    return "locked"; // Day 10+: Full renewal paywall lock
  }
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const todayDate = new Date().toISOString().split("T")[0];

  // 1. Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Redirect to onboarding if contract is unsigned or handle is missing
  if (!profile || !profile.handle || !profile.contract_signed_at) {
    return redirect("/onboarding");
  }

  // NOTE: Removed the harsh `!profile.stake_paid` redirect trap entirely!

  // 2. Fetch or initialize today's daily log
  let { data: todayLog } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", todayDate)
    .maybeSingle();

  if (!todayLog) {
    const { data: createdLog } = await supabase
      .from("daily_logs")
      .insert({
        user_id: user.id,
        log_date: todayDate,
        meals_logged: 0,
        gym_done: false,
        editing_done: false,
      })
      .select()
      .single();
    todayLog = createdLog;
  }

  // =====================================================================
  // NEW: Increment active days for Lobby Progression (Once per day)
  // =====================================================================
  const currentStatus = getProtocolStatus(profile.trial_ends_at);
  if (currentStatus !== "locked" && profile.last_active_date !== todayDate) {
    await supabase
      .from("profiles")
      .update({
        active_days_count: (profile.active_days_count || 0) + 1,
        last_active_date: todayDate,
      })
      .eq("id", user.id);
  }
  // =====================================================================

  // 3. Fetch past 7 days of time logs for visual bar sparklines
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const { data: recentTimeLogs } = await supabase
    .from("time_logs")
    .select("activity, duration_seconds, log_date, created_at")
    .eq("user_id", user.id)
    .gte("log_date", sevenDaysAgoStr);

  const timeLogs = recentTimeLogs || [];

  // Calculate today's logged durations
  let todayGymSeconds = 0;
  let todayWorkSeconds = 0;

  timeLogs.forEach((l) => {
    const isToday = l.log_date === todayDate || l.created_at?.startsWith(todayDate);
    if (isToday) {
      if (l.activity === "gym_workout") todayGymSeconds += l.duration_seconds || 0;
      if (l.activity === "editing_deep_work") todayWorkSeconds += l.duration_seconds || 0;
    }
  });

  // Calculate 7-day relative bar heights (0–100%)
  const workTrend: number[] = [];
  const gymTrend: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    const dayWorkSecs = timeLogs
      .filter((l) => l.activity === "editing_deep_work" && (l.log_date === dateStr || l.created_at?.startsWith(dateStr)))
      .reduce((sum, l) => sum + (l.duration_seconds || 0), 0);

    const dayGymSecs = timeLogs
      .filter((l) => l.activity === "gym_workout" && (l.log_date === dateStr || l.created_at?.startsWith(dateStr)))
      .reduce((sum, l) => sum + (l.duration_seconds || 0), 0);

    workTrend.push(Math.min(100, Math.round((dayWorkSecs / 14400) * 100)));
    gymTrend.push(Math.min(100, Math.round((dayGymSecs / 5400) * 100)));
  }

  // 4. Fetch past 30 days of daily logs for consistency scoring
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const { data: monthLogs } = await supabase
    .from("daily_logs")
    .select("gym_done, editing_done, meals_logged, workout, deep_work")
    .eq("user_id", user.id)
    .gte("log_date", thirtyDaysAgoStr);

  let completedPillars = 0;
  const trackedDays = Math.max(monthLogs?.length || 1, 1);

  (monthLogs || []).forEach((day) => {
    if (day.gym_done || day.workout) completedPillars++;
    if (day.editing_done || day.deep_work) completedPillars++;
    if ((day.meals_logged || 0) >= 5) completedPillars++;
  });

  const totalPossible = trackedDays * 3;
  const consistencyScore = Math.min(100, Math.round((completedPillars / (totalPossible || 1)) * 100));

  // 5. Calculate Arena community percentile based on Earned AP (Dual-Ledger)
  const userAP = profile.earned_ap ?? profile.aura_points ?? 0;
  const { count: totalOperators } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const { count: belowCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .lt("earned_ap", userAP);

  const total = totalOperators || 1;
  const below = belowCount || 0;
  const rankPercent = Math.max(1, 100 - Math.round((below / total) * 100));

  const analytics = {
    consistencyScore,
    percentile: rankPercent,
    workTrend,
    gymTrend,
    gymTime: formatDuration(todayGymSeconds),
    editingTime: formatDuration(todayWorkSeconds),
    auraPoints: userAP,
    vaultAp: profile.vault_ap || 0,
    identityRank: profile.identity_rank || "Initiate",
    currentStreak: profile.current_streak || 0,
    streakShields: profile.streak_shields || 0,
    protocolStatus: currentStatus, 
  };

  return (
    <CheckInClient
      profile={profile}
      initialLog={todayLog}
      gesture={getDailyGesture()}
      analytics={analytics}
    />
  );
}

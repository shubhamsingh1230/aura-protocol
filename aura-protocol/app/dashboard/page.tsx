import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckInClient from "@/components/dashboard/CheckInClient";
import { getTodayLogDate } from "@/lib/timezone";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // 1. Fetch user profile (includes aura_points, xp, streaks, rank)
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const logDate = getTodayLogDate(profile?.timezone_offset || 0);

  // 2. Fetch or initialize today's daily log
  let { data: log } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", logDate)
    .single();

  if (!log) {
    const { data: newLog } = await supabase
      .from("daily_logs")
      .insert({ 
        user_id: user.id, 
        log_date: logDate,
        daily_score: 0,
        ap_earned: 0,
        xp_earned: 0
      })
      .select()
      .single();
    log = newLog;
  }

  // 3. Fetch Today's Gesture
  const { data: gestureData } = await supabase
    .from("daily_gestures")
    .select("gesture_name")
    .eq("date", logDate)
    .single();

  // 4. Fetch 30-Day Consistency Data (Supports both 7-pillar and legacy fields)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: monthLogs } = await supabase
    .from("daily_logs")
    .select("gym_done, editing_done, meals_logged, workout, deep_work, nutrition, morning_routine, learning, sleep_target, daily_review, daily_score")
    .eq("user_id", user.id)
    .gte("log_date", thirtyDaysAgo.toISOString().split("T")[0]);

  let totalPillarsHit = 0;
  const daysTracked = monthLogs?.length || 1;
  const maxPossiblePillars = daysTracked * 7;

  monthLogs?.forEach((day: any) => {
    // Check 7 pillars, falling back to legacy fields if present
    if (day.workout || day.gym_done) totalPillarsHit++;
    if (day.deep_work || day.editing_done) totalPillarsHit++;
    if (day.nutrition || day.meals_logged === 5) totalPillarsHit++;
    if (day.morning_routine) totalPillarsHit++;
    if (day.learning) totalPillarsHit++;
    if (day.sleep_target) totalPillarsHit++;
    if (day.daily_review) totalPillarsHit++;
  });

  const consistencyScore = Math.min(100, Math.round((totalPillarsHit / maxPossiblePillars) * 100));

  // 5. Fetch 7-Day Time Trends (For the Bar Charts)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: weekTimeLogs } = await supabase
    .from("time_logs")
    .select("activity, duration_seconds, log_date")
    .eq("user_id", user.id)
    .gte("log_date", sevenDaysAgo.toISOString().split("T")[0]);

  const workTrend = [0, 0, 0, 0, 0, 0, 0];
  const gymTrend = [0, 0, 0, 0, 0, 0, 0];
  let todayGymSeconds = 0;
  let todayEditSeconds = 0;

  weekTimeLogs?.forEach((timeLog) => {
    const logAge = Math.floor((new Date().getTime() - new Date(timeLog.log_date).getTime()) / (1000 * 3600 * 24));
    const dayIndex = 6 - (logAge > 6 ? 6 : logAge);

    if (timeLog.activity === "gym_workout") {
      gymTrend[dayIndex] += timeLog.duration_seconds;
      if (timeLog.log_date === logDate) todayGymSeconds += timeLog.duration_seconds;
    }
    if (timeLog.activity === "editing_deep_work") {
      workTrend[dayIndex] += timeLog.duration_seconds;
      if (timeLog.log_date === logDate) todayEditSeconds += timeLog.duration_seconds;
    }
  });

  const normalizedWorkTrend = workTrend.map((sec) => Math.min(Math.round((sec / 14400) * 100), 100));
  const normalizedGymTrend = gymTrend.map((sec) => Math.min(Math.round((sec / 7200) * 100), 100));

  const formatTime = (totalSeconds: number) => {
    if (totalSeconds === 0) return "0m";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const analyticsData = {
    gymTime: formatTime(todayGymSeconds),
    editingTime: formatTime(todayEditSeconds),
    workTrend: normalizedWorkTrend,
    gymTrend: normalizedGymTrend,
    consistencyScore: consistencyScore,
    percentile: 14,
    // Upgraded Protocol Metrics
    auraPoints: profile?.aura_points || 0,
    identityRank: profile?.identity_rank || "Initiate",
    currentStreak: profile?.current_streak || 0,
    streakShields: profile?.streak_shields || 0,
    subscriptionStatus: profile?.subscription_status || "trialing",
  };

  return (
    <CheckInClient 
      profile={profile} 
      initialLog={log!} 
      gesture={gestureData?.gesture_name || "Peace Sign"} 
      analytics={analyticsData} 
    />
  );
}

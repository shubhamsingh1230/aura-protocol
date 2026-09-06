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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const logDate = getTodayLogDate(profile?.timezone_offset || 0);

  // 1. Fetch Today's Log
  let { data: log } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", logDate)
    .single();

  if (!log) {
    const { data: newLog } = await supabase
      .from("daily_logs")
      .insert({ user_id: user.id, log_date: logDate })
      .select()
      .single();
    log = newLog;
  }

  // 2. Fetch Today's Gesture
  const { data: gestureData } = await supabase
    .from("daily_gestures")
    .select("gesture_name")
    .eq("date", logDate)
    .single();

  // 3. Fetch 30-Day Consistency Data
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: monthLogs } = await supabase
    .from("daily_logs")
    .select("gym_done, editing_done, meals_logged")
    .eq("user_id", user.id)
    .gte("log_date", thirtyDaysAgo.toISOString().split('T')[0]);

  let totalPillarsHit = 0;
  const maxPossiblePillars = (monthLogs?.length || 1) * 3; 

  monthLogs?.forEach((day) => {
    if (day.gym_done) totalPillarsHit++;
    if (day.editing_done) totalPillarsHit++;
    if (day.meals_logged === 5) totalPillarsHit++;
  });
  
  const consistencyScore = Math.round((totalPillarsHit / (maxPossiblePillars || 1)) * 100);

  // 4. Fetch 7-Day Time Trends (For the Bar Charts)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: weekTimeLogs } = await supabase
    .from("time_logs")
    .select("activity, duration_seconds, log_date")
    .eq("user_id", user.id)
    .gte("log_date", sevenDaysAgo.toISOString().split('T')[0]);

  // Process trends into 7-day arrays (0-100% heights)
  const workTrend = [0, 0, 0, 0, 0, 0, 0];
  const gymTrend = [0, 0, 0, 0, 0, 0, 0];
  let todayGymSeconds = 0;
  let todayEditSeconds = 0;

  weekTimeLogs?.forEach((timeLog) => {
    const logAge = Math.floor((new Date().getTime() - new Date(timeLog.log_date).getTime()) / (1000 * 3600 * 24));
    const dayIndex = 6 - (logAge > 6 ? 6 : logAge); // Map to 0-6 array

    if (timeLog.activity === 'gym_workout') {
      gymTrend[dayIndex] += timeLog.duration_seconds;
      if (timeLog.log_date === logDate) todayGymSeconds += timeLog.duration_seconds;
    }
    if (timeLog.activity === 'editing_deep_work') {
      workTrend[dayIndex] += timeLog.duration_seconds;
      if (timeLog.log_date === logDate) todayEditSeconds += timeLog.duration_seconds;
    }
  });

  // Normalize arrays to percentages (max 4 hours for work, 2 hours for gym)
  const normalizedWorkTrend = workTrend.map(sec => Math.min(Math.round((sec / 14400) * 100), 100));
  const normalizedGymTrend = gymTrend.map(sec => Math.min(Math.round((sec / 7200) * 100), 100));

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
    percentile: 14 // Will require a complex global ranking query later
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

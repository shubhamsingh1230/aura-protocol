import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTodayLogDate } from "@/lib/timezone";
import { hasLiveStakeInActiveSeason } from "@/lib/season";
import CheckInClient from "@/components/dashboard/CheckInClient";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.contract_signed_at) redirect("/onboarding");

  const { hasStake } = await hasLiveStakeInActiveSeason(user.id);
  if (!hasStake) redirect("/onboarding/stake");

  const logDate = getTodayLogDate(profile.timezone_offset);

  const { data: gesture } = await supabase
    .from("daily_gestures")
    .select("*")
    .eq("gesture_date", logDate)
    .maybeSingle();

 const resolvedGesture = gesture ?? { gesture_label: "Peace Sign" };

  let { data: log } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", logDate)
    .maybeSingle();

  if (!log) {
    const { data: created } = await supabase
      .from("daily_logs")
      .insert({
        user_id: user.id,
        log_date: logDate,
        timezone_offset: profile.timezone_offset,
        gesture_of_the_day: resolvedGesture.gesture_label,
      })
      .select("*")
      .single();
    log = created ?? null;
  }
// ... existing code fetching profile and log ...

 // 1. Fetch today's time logs for the Time Engine
  const { data: timeLogs } = await supabase
    .from("time_logs")
    .select("activity, duration_seconds")
    .eq("user_id", user.id)
    .eq("log_date", logDate);

  // 2. Aggregate the seconds into formatted strings
  let gymSeconds = 0;
  let editSeconds = 0;

  timeLogs?.forEach((timeLog) => {
    if (timeLog.activity === 'gym_workout') gymSeconds += timeLog.duration_seconds;
    if (timeLog.activity === 'editing_deep_work') editSeconds += timeLog.duration_seconds;
  });

  const formatTime = (totalSeconds: number) => {
    if (totalSeconds === 0) return "0m";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const timeStats = {
    gym: formatTime(gymSeconds),
    editing: formatTime(editSeconds)
  };

  // 3. Pass the new timeStats prop to the client component
  return (
    <CheckInClient 
      profile={profile} 
      initialLog={log!} 
      gesture={resolvedGesture} 
      timeStats={timeStats} 
    />
  );
}

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

  return (
    <CheckInClient profile={profile} initialLog={log!} gesture={resolvedGesture} />
  );
}

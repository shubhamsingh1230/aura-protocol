"use server";

import { createClient } from "@/lib/supabase/server";
import { getTodayLogDate } from "@/lib/timezone";

export async function recordTimeSession(activityKey: string, sessionSeconds: number) {
  // Don't record accidental clicks or 0-second sessions
  if (sessionSeconds < 5) return { success: false, message: "Session too short" };

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) return { success: false, message: "Unauthorized" };

  // Fetch timezone offset to ensure the time is logged to the correct local day
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone_offset")
    .eq("id", user.id)
    .single();

  const logDate = getTodayLogDate(profile?.timezone_offset || 0);

  // Insert the session into the database
  const { error } = await supabase.from("time_logs").insert({
    user_id: user.id,
    log_date: logDate,
    activity: activityKey,
    duration_seconds: sessionSeconds
  });

  if (error) {
    console.error("Failed to log time:", error);
    return { success: false };
  }

  return { success: true };
}

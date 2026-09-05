import { createClient } from "@/lib/supabase/server";

/**
 * Generates the current ISO week string (e.g., '2026-W36').
 * This acts as our clean, automated weekly lobby identifier.
 */
function getCurrentWeekId(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export async function hasLiveStakeInActiveSeason(userId: string): Promise<{
  hasStake: boolean;
  seasonId: string | null;
}> {
  const supabase = createClient();
  const currentWeekId = getCurrentWeekId();

  // Check if a stake exists for this user for the current week with a valid status
  const { data: stake } = await supabase
    .from("stakes")
    .select("status")
    .eq("user_id", userId)
    .eq("week_id", currentWeekId)
    .maybeSingle();

  const hasStake = Boolean(stake && ["paid", "refunded", "won"].includes(stake.status));
  
  // We return currentWeekId as the seasonId equivalent so downstream components stay happy
  return { hasStake, seasonId: currentWeekId };
}

import { createClient } from "@/lib/supabase/server";

export async function hasLiveStakeInActiveSeason(userId: string): Promise<{
  hasStake: boolean;
  seasonId: string | null;
}> {
  const supabase = createClient();

  // Call the database function to get the active season
  const { data: seasonData } = await supabase.rpc("get_active_season");

  // SAFETY FIX: Check if Supabase returned an array and grab the first item, or use the object directly
  const season = Array.isArray(seasonData) ? seasonData[0] : seasonData;

  // If there is no active season or no valid ID, return false safely
  if (!season || !season.id) {
    return { hasStake: false, seasonId: null };
  }

  // Check if a stake exists for this user in this specific season with a valid status
  const { data: stake } = await supabase
    .from("stakes")
    .select("status")
    .eq("user_id", userId)
    .eq("season_id", season.id)
    .maybeSingle();

  const hasStake = Boolean(stake && ["paid", "refunded", "won"].includes(stake.status));
  return { hasStake, seasonId: season.id };
}

import { createClient } from "@/lib/supabase/server";

/**
 * A profile's stake_paid flag is a one-time "cleared the paywall once" bit —
 * it doesn't know a new season started. This checks the thing that
 * actually gates dashboard access: a stake row for the CURRENT active
 * season in a status that counts as "in the game" (paid, or already
 * settled as refunded/won from a previous read of this same season).
 */
export async function hasLiveStakeInActiveSeason(userId: string): Promise<{
  hasStake: boolean;
  seasonId: string | null;
}> {
  const supabase = createClient();

  const { data: season } = await supabase.rpc("get_active_season");
  if (!season) return { hasStake: false, seasonId: null };

  const { data: stake } = await supabase
    .from("stakes")
    .select("status")
    .eq("user_id", userId)
    .eq("season_id", season.id)
    .maybeSingle();

  const hasStake = Boolean(stake && ["paid", "refunded", "won"].includes(stake.status));
  return { hasStake, seasonId: season.id };
}

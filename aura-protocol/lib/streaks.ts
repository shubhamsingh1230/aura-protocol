export interface StreakTier {
  minDays: number;
  label: string;
  icon: string;
  colorClass: string;
}

/**
 * Evolving streak tiers. current_streak resets to 1 the moment a day is
 * missed (see apply_daily_log_to_profile() in supabase/schema.sql), so a
 * tier drop is exactly the "shatter" moment the checklist describes.
 */
export const STREAK_TIERS: StreakTier[] = [
  { minDays: 0, label: "Day One", icon: "🌱", colorClass: "text-grey-flat" },
  { minDays: 3, label: "Locked In", icon: "🔒", colorClass: "text-ice" },
  { minDays: 7, label: "Let Him Cook", icon: "🍳", colorClass: "text-mint" },
  { minDays: 14, label: "Untouchable", icon: "🛡️", colorClass: "text-gold" },
  { minDays: 21, label: "Ascended", icon: "⚡", colorClass: "text-gold" },
  { minDays: 30, label: "Aura God", icon: "👁️", colorClass: "text-gold" },
];

export function getStreakTier(days: number): StreakTier {
  let tier = STREAK_TIERS[0];
  for (const t of STREAK_TIERS) {
    if (days >= t.minDays) tier = t;
  }
  return tier;
}

import type { DailyLog } from "@/types/database";

/**
 * The 7-Pillar Gauntlet.
 * This mirrors calculate_daily_aura() in supabase/schema.sql exactly, so the
 * check-in screen can show live progress rings before the row is saved. The
 * database trigger is the source of truth — this is a preview only.
 */
export const PILLAR_SLOTS = [
  "breakfast_img",
  "lunch_img",
  "pre_workout_img",
  "post_workout_img",
  "dinner_img",
] as const;

export const MEAL_AURA = 10; // per meal, 5 meals = 50
export const MOVEMENT_AURA = 25;
export const GRIND_AURA = 25;
export const SURGE_MULTIPLIER = 1.5;
export const BASE_AURA_MAX = MEAL_AURA * 5 + MOVEMENT_AURA + GRIND_AURA; // 100
export const SURGE_AURA_MAX = Math.round(BASE_AURA_MAX * SURGE_MULTIPLIER); // 150

export interface AuraPreview {
  mealsDone: number;
  movementDone: boolean;
  grindDone: boolean;
  baseAura: number;
  isPerfectDay: boolean;
  finalAura: number;
  pillarsCompleted: number; // 0-7, for the progress ring
}

export function previewAura(
  log: Partial<
    Pick<
      DailyLog,
      | "breakfast_img"
      | "lunch_img"
      | "pre_workout_img"
      | "post_workout_img"
      | "dinner_img"
      | "movement_img"
      | "grind_img"
      | "is_rest_token_used"
    >
  >
): AuraPreview {
  const mealsDone = PILLAR_SLOTS.filter((slot) => Boolean(log[slot])).length;
  const movementDone = Boolean(log.movement_img) || Boolean(log.is_rest_token_used);
  const grindDone = Boolean(log.grind_img);

  const baseAura =
    mealsDone * MEAL_AURA +
    (movementDone ? MOVEMENT_AURA : 0) +
    (grindDone ? GRIND_AURA : 0);

  const isPerfectDay = mealsDone === 5 && movementDone && grindDone;
  const finalAura = isPerfectDay ? Math.round(baseAura * SURGE_MULTIPLIER) : baseAura;

  return {
    mealsDone,
    movementDone,
    grindDone,
    baseAura,
    isPerfectDay,
    finalAura,
    pillarsCompleted: mealsDone + (movementDone ? 1 : 0) + (grindDone ? 1 : 0),
  };
}

export function rankGlowClass(rankTitle: string): string {
  if (rankTitle.includes("FINAL BOSS")) return "text-gold shadow-glow-gold";
  if (rankTitle.includes("OG")) return "text-ice";
  if (rankTitle.includes("TRYING BLUD")) return "text-bronze";
  return "text-grey-flat";
}

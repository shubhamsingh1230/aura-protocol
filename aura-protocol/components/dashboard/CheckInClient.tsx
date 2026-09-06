"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { DailyLog, Profile } from "@/types/database";
import { previewAura, PILLAR_SLOTS } from "@/lib/aura";
import { Utensils, Coffee, Flame, Laptop, Dumbbell, Sparkles } from "lucide-react";
import GestureBanner from "./GestureBanner";
import ProgressRings from "./ProgressRing";
import PhotoUploadSlot from "./PhotoUploadSlot";
import StreakBadge from "./StreakBadge";

// Mapped to professional Lucide icons instead of raw emojis
const MEAL_SLOTS: { slot: (typeof PILLAR_SLOTS)[number]; label: string; icon: React.ReactNode }[] = [
  { slot: "breakfast_img", label: "Breakfast", icon: <Coffee className="w-4 h-4" /> },
  { slot: "lunch_img", label: "Lunch", icon: <Utensils className="w-4 h-4" /> },
  { slot: "pre_workout_img", label: "Pre-workout", icon: <Flame className="w-4 h-4" /> },
  { slot: "post_workout_img", label: "Post-workout", icon: <Dumbbell className="w-4 h-4" /> },
  { slot: "dinner_img", label: "Dinner", icon: <Utensils className="w-4 h-4" /> },
];

export default function CheckInClient({
  profile,
  initialLog,
  gesture,
}: {
  profile: Profile;
  initialLog: DailyLog;
  gesture: { gesture_label: string; gesture_emoji?: string };
}) {
  const supabase = createClient();
  const [log, setLog] = useState<DailyLog>(initialLog);
  const [calories, setCalories] = useState(log.calories_logged?.toString() ?? "");
  const [redeeming, setRedeeming] = useState(false);

  const preview = previewAura(log);

  async function persist(patch: Partial<DailyLog>) {
    const optimistic = { ...log, ...patch };
    setLog(optimistic);

    const { data, error } = await supabase
      .from("daily_logs")
      .update(patch)
      .eq("id", log.id)
      .select("*")
      .single();

    if (!error && data) setLog(data);
  }

  function handleUploaded(slot: string, url: string) {
    persist({ [slot]: url } as Partial<DailyLog>);
  }

  async function handleRedeemRestToken() {
    if (profile.rest_tokens_remaining < 1 || log.movement_img || log.is_rest_token_used) return;
    setRedeeming(true);
    await persist({ is_rest_token_used: true });
    await supabase
      .from("profiles")
      .update({ rest_tokens_remaining: profile.rest_tokens_remaining - 1 })
      .eq("id", profile.id);
    setRedeeming(false);
  }

  async function handleCaloriesBlur() {
    const parsed = parseInt(calories, 10);
    if (Number.isNaN(parsed)) return;
    await persist({ calories_logged: parsed });
  }

  return (
    <div className="px-5 pt-12 pb-32">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-zinc-500 text-xs tracking-widest uppercase mb-1">Welcome back</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{profile.display_name}</h1>
        </div>
        <div className="liquid-glass px-4 py-2 rounded-2xl text-right">
          <p className="text-lg font-bold tabular text-emerald-400">{profile.total_aura}</p>
          <p className="text-[10px] text-zinc-500 tracking-wider">TOTAL AURA</p>
        </div>
      </div>

      <GestureBanner
        label={gesture.gesture_label}
        verified={log.gesture_verified}
        onToggleVerified={() => persist({ gesture_verified: !log.gesture_verified })}
      />

      {/* Streak & Tokens Bar */}
      <div className="flex items-center justify-between liquid-glass rounded-3xl px-5 py-4 mb-6">
        <StreakBadge userId={profile.id} currentStreak={profile.current_streak} />
        <div className="text-right">
          <p className="text-[10px] text-zinc-500 tracking-wider uppercase mb-0.5">Rest Tokens</p>
          <p className="text-sm font-semibold text-white">{profile.rest_tokens_remaining} left</p>
        </div>
      </div>

      <div className="flex justify-center mb-6">
        <ProgressRings
          mealsProgress={preview.mealsDone / 5}
          movementDone={preview.movementDone}
          grindDone={preview.grindDone}
          isPerfectDay={preview.isPerfectDay}
        />
      </div>

      <motion.div
        key={preview.finalAura}
        initial={{ scale: 0.96, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center mb-8"
      >
        <p className="text-3xl font-bold tabular tracking-tight text-white">{preview.finalAura}</p>
        <p className="text-[11px] text-zinc-500 tracking-widest uppercase mt-1">
          Aura Today{preview.isPerfectDay ? " · 1.5× Surge Active" : ""}
        </p>
      </motion.div>

      <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-3">Meals</p>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {MEAL_SLOTS.map((m) => (
          <PhotoUploadSlot
            key={m.slot}
            slot={m.slot}
            label={m.label}
            icon={m.icon}
            imageUrl={log[m.slot]}
            userId={profile.id}
            logDate={log.log_date}
            onUploaded={handleUploaded}
          />
        ))}
      </div>

      <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-3">
        {profile.movement_label} & {profile.grind_label}
      </p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <PhotoUploadSlot
          slot="movement_img"
          label={profile.movement_label}
          icon={<Dumbbell className="w-4 h-4" />}
          imageUrl={log.movement_img}
          userId={profile.id}
          logDate={log.log_date}
          disabled={log.is_rest_token_used}
          onUploaded={handleUploaded}
        />
        <PhotoUploadSlot
          slot="grind_img"
          label={profile.grind_label}
          icon={<Laptop className="w-4 h-4" />}
          imageUrl={log.grind_img}
          userId={profile.id}
          logDate={log.log_date}
          onUploaded={handleUploaded}
        />
      </div>

      {!log.movement_img && !log.is_rest_token_used && profile.rest_tokens_remaining > 0 && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleRedeemRestToken}
          disabled={redeeming}
          className="w-full liquid-glass rounded-2xl py-3.5 text-xs text-cyan-400 font-medium mb-6 hover:bg-white/[0.06] transition-colors"
        >
          {redeeming ? "Redeeming…" : `Redeem Rest Token — auto-clears ${profile.movement_label}`}
        </motion.button>
      )}
      {log.is_rest_token_used && (
        <div className="w-full rounded-2xl py-3.5 text-xs text-cyan-400 font-medium mb-6 text-center bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-md">
          Rest Token used today — {profile.movement_label} auto-cleared
        </div>
      )}

      <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-3">
        Calories{profile.calorie_goal ? ` · goal ${profile.calorie_goal}` : ""}
      </p>
      <input
        type="number"
        inputMode="numeric"
        placeholder={profile.calorie_goal ? `${profile.calorie_goal}` : "e.g. 2200"}
        value={calories}
        onChange={(e) => setCalories(e.target.value)}
        onBlur={handleCaloriesBlur}
        className="w-full liquid-glass rounded-2xl px-4 py-3.5 text-sm placeholder:text-zinc-600 text-white outline-none focus:border-emerald-500/50 transition-colors"
      />
    </div>
  );
}

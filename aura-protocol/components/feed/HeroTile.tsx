"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import LongPressFlag from "./LongPressFlag";
import RankBadge from "@/components/leaderboard/RankBadge";
import Avatar from "@/components/ui/Avatar";
import type { DailyLog, Profile } from "@/types/database";

const MEAL_LABELS: { slot: keyof DailyLog; label: string }[] = [
  { slot: "breakfast_img", label: "Breakfast" },
  { slot: "lunch_img", label: "Lunch" },
  { slot: "pre_workout_img", label: "Pre-workout" },
  { slot: "post_workout_img", label: "Post-workout" },
  { slot: "dinner_img", label: "Dinner" },
];

type Author = Pick<
  Profile,
  "display_name" | "rank_title" | "current_streak" | "movement_label" | "grind_label"
>;

export default function HeroTile({
  log,
  author,
  isOwnEntry,
  alreadyFlaggedByMe,
  onFlag,
}: {
  log: DailyLog;
  author: Author;
  isOwnEntry: boolean;
  alreadyFlaggedByMe: boolean;
  onFlag: () => Promise<void> | void;
}) {
  const [expanded, setExpanded] = useState(false);
  const loggedMeals = MEAL_LABELS.filter((m) => Boolean(log[m.slot]));

  // Proxy for "posted just now" — a live status dot, not real presence.
  const isFresh = Date.now() - new Date(log.updated_at).getTime() < 15 * 60 * 1000;

  return (
    <div
      className={clsx(
        "glass rounded-card p-4 mb-4",
        log.is_perfect_day && "border-mint/30 shadow-glow"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={author.display_name} live={isFresh} size="sm" />
          <div>
            <span className="font-medium block leading-tight">{author.display_name}</span>
            <RankBadge rankTitle={author.rank_title} size="sm" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-mint font-semibold tabular text-sm">
            +{log.daily_aura_earned}
          </span>
          {!isOwnEntry && (
            <LongPressFlag alreadyFlaggedByMe={alreadyFlaggedByMe} onConfirmFlag={onFlag} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <HeroImage
          src={log.movement_img}
          label={author.movement_label}
          fallback="🏃"
          restToken={log.is_rest_token_used}
        />
        <HeroImage src={log.grind_img} label={author.grind_label} fallback="💻" />
      </div>

      {/* Data stamp — claimed calories + goal status, so the feed isn't just
          photos with no numbers behind them. */}
      {(log.calories_logged != null || log.gesture_verified) && (
        <div className="flex items-center gap-2 text-[11px] text-grey-text mb-2 px-0.5 flex-wrap">
          {log.calories_logged != null && (
            <span className="tabular">
              {log.calories_logged} kcal claimed
              {log.calorie_goal_met && <span className="text-mint"> · goal hit</span>}
            </span>
          )}
          {log.gesture_verified && (
            <span className="text-ice">
              {log.calories_logged != null ? "· " : ""}gesture claimed ✓
            </span>
          )}
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left text-[13px] text-grey-text py-2 flex items-center justify-between"
      >
        <span>{loggedMeals.length}/5 meals logged</span>
        <span className={clsx("transition-transform", expanded && "rotate-180")}>⌄</span>
      </motion.button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-5 gap-2 pt-1">
              {MEAL_LABELS.map((m) => (
                <div key={m.slot} className="aspect-square rounded-lg overflow-hidden bg-card-active">
                  {log[m.slot] ? (
                    <img src={log[m.slot] as string} alt={m.label} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-grey-flat text-[10px]">
                      {m.label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HeroImage({
  src,
  label,
  fallback,
  restToken,
}: {
  src: string | null;
  label: string;
  fallback: string;
  restToken?: boolean;
}) {
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-card-active">
      {src ? (
        <img
          src={src}
          alt={label}
          onContextMenu={(e) => e.preventDefault()} // <-- BLOCKS MOBILE LONG-PRESS MENU
          className="w-full h-full object-cover select-none [-webkit-touch-callout:none] [-webkit-user-select:none]" // <-- DISABLES MOBILE HIGHLIGHTING
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-grey-flat">
          <span className="text-xl">{fallback}</span>
          <span className="text-[10px]">Not yet</span>
        </div>
      )}
      <div className="absolute bottom-1.5 left-1.5 bg-black/60 rounded-md px-1.5 py-0.5 text-[10px]">
        {restToken ? "Rest Token" : label}
      </div>
    </div>
  );
}

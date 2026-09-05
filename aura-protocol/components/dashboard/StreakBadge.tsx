"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStreakTier } from "@/lib/streaks";

export default function StreakBadge({
  userId,
  currentStreak,
}: {
  userId: string;
  currentStreak: number;
}) {
  const [shattering, setShattering] = useState(false);
  const tier = getStreakTier(currentStreak);
  const storageKey = `aura:last-streak:${userId}`;

  useEffect(() => {
    const prevRaw = window.localStorage.getItem(storageKey);
    const prev = prevRaw ? parseInt(prevRaw, 10) : currentStreak;

    // A drop of 2+ days (not just yesterday's +1 rolling forward) means a
    // day was missed and the old tier shattered back down.
    if (!Number.isNaN(prev) && currentStreak < prev - 1) {
      setShattering(true);
      const t = setTimeout(() => setShattering(false), 900);
      window.localStorage.setItem(storageKey, String(currentStreak));
      return () => clearTimeout(t);
    }

    window.localStorage.setItem(storageKey, String(currentStreak));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStreak]);

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <AnimatePresence mode="wait">
        {shattering ? (
          <motion.span
            key="shatter"
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 1.6, rotate: 8 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            className="text-crimson text-lg"
          >
            💥
          </motion.span>
        ) : (
          <motion.span
            key={tier.label}
            initial={{ opacity: 0, y: -4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`text-lg ${tier.colorClass}`}
          >
            {tier.icon}
          </motion.span>
        )}
      </AnimatePresence>
      <div className="flex flex-col leading-tight">
        <span className={`text-sm font-semibold ${tier.colorClass}`}>{tier.label}</span>
        <span className="text-[11px] text-grey-text">{currentStreak} day streak</span>
      </div>
    </div>
  );
}

"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import RankBadge from "./RankBadge";
import Avatar from "@/components/ui/Avatar";
import { getStreakTier } from "@/lib/streaks";
import type { Profile } from "@/types/database";

type Row = Pick<
  Profile,
  "id" | "display_name" | "rank_title" | "total_aura" | "current_streak" | "longest_streak"
>;

export default function LeaderboardClient({
  profiles,
  currentUserId,
}: {
  profiles: Row[];
  currentUserId: string;
}) {
  return (
    <div className="px-5 pt-14">
      <h1 className="text-2xl font-semibold mb-1">Leaderboard</h1>
      <p className="text-grey-text text-sm mb-6">Season 1 · resets every Monday</p>

      <div className="space-y-2">
        {profiles.map((p, i) => {
          const isMe = p.id === currentUserId;
          const isTop3 = i < 3;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.03 }}
              className={clsx(
                "flex items-center gap-3 rounded-card px-4 py-3",
                isMe ? "glass border border-mint/30" : "bg-card border border-border",
                isTop3 && "shadow-glow-gold/0"
              )}
            >
              <span
                className={clsx(
                  "w-7 text-center font-bold tabular text-sm",
                  isTop3 ? "text-gold" : "text-grey-flat"
                )}
              >
                {i + 1}
              </span>

              <Avatar name={p.display_name} size="sm" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{p.display_name}</span>
                  {isMe && <span className="text-[10px] text-mint">YOU</span>}
                </div>
                <RankBadge rankTitle={p.rank_title} size="sm" />
              </div>

              <div className="text-right shrink-0">
                <p className="font-bold tabular">{p.total_aura}</p>
                <p className="text-[11px] text-grey-text">
                  {getStreakTier(p.current_streak).icon} {p.current_streak}d
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

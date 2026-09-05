"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import HeroTile from "./HeroTile";
import type { DailyLog, Profile } from "@/types/database";

type FeedLog = DailyLog & {
  profiles: Pick<
    Profile,
    "display_name" | "rank_title" | "current_streak" | "movement_label" | "grind_label"
  >;
};

export default function FeedClient({
  currentUserId,
  logs,
  flaggedLogIds,
}: {
  currentUserId: string;
  logs: FeedLog[];
  flaggedLogIds: string[];
}) {
  const supabase = createClient();
  const [flagged, setFlagged] = useState<Set<string>>(new Set(flaggedLogIds));

  async function handleFlag(dailyLogId: string) {
    setFlagged((prev) => new Set(prev).add(dailyLogId));
    await supabase.from("flags").insert({
      daily_log_id: dailyLogId,
      flagged_by_user_id: currentUserId,
    });
  }

  return (
    <div className="px-5 pt-14">
      <h1 className="text-2xl font-semibold mb-1">The Feed</h1>
      <p className="text-grey-text text-sm mb-6">
        Hold the flag for 1.5s on anything that looks faked. False flags cost you 10 Aura.
      </p>

      {logs.length === 0 && (
        <div className="glass rounded-card p-8 text-center text-grey-text text-sm">
          No check-ins yet today. Be the first to grind.
        </div>
      )}

      {logs.map((log) => (
        <HeroTile
          key={log.id}
          log={log}
          author={log.profiles}
          isOwnEntry={log.user_id === currentUserId}
          alreadyFlaggedByMe={flagged.has(log.id)}
          onFlag={() => handleFlag(log.id)}
        />
      ))}
    </div>
  );
}

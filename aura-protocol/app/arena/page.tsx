// app/arena/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Trophy, 
  Flame, 
  Sparkles, 
  Shield, 
  Users, 
  Crown, 
  Loader2
} from "lucide-react";
import Link from "next/link";

interface LeaderboardOperator {
  id: string;
  handle: string | null;
  full_name: string | null;
  aura_points: number;
  current_streak: number;
  identity_rank: string;
  subscription_status: string;
}

export default function ArenaPage() {
  const [scope, setScope] = useState<"global" | "squad">("global");
  const [operators, setOperators] = useState<LeaderboardOperator[]>([]);
  const [squadIds, setSquadIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadArenaData();
  }, [scope]);

  async function loadArenaData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // 1. Fetch squad member IDs if filtering by squad
    let squadMemberIds = new Set<string>([user.id]);
    if (scope === "squad") {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      (friendships || []).forEach((f) => {
        squadMemberIds.add(f.user_id === user.id ? f.friend_id : f.user_id);
      });
      setSquadIds(squadMemberIds);
    }

    // 2. Fetch operators ranked by Aura Points
    let query = supabase
      .from("profiles")
      .select("id, handle, full_name, aura_points, current_streak, identity_rank, subscription_status")
      .order("aura_points", { ascending: false })
      .limit(50);

    if (scope === "squad" && squadMemberIds.size > 0) {
      query = query.in("id", Array.from(squadMemberIds));
    }

    const { data: rankedData } = await query;
    setOperators(rankedData || []);
    setLoading(false);
  }

  // Calculate Community Stake Pool metrics (₹10 stake per active operator)
  const activeOperatorCount = operators.filter((o) => o.subscription_status === "active").length;
  const estimatedPoolInr = Math.max(activeOperatorCount * 10, 100);

  const topThree = operators.slice(0, 3);
  const restOperators = operators.slice(3);

  function getRankBadgeColor(rank: string) {
    switch (rank) {
      case "Apex":
        return "bg-amber-500/10 text-amber-700 border-amber-500/30";
      case "Elite":
        return "bg-purple-500/10 text-purple-700 border-purple-500/30";
      case "Operator":
        return "bg-blue-500/10 text-blue-700 border-blue-500/30";
      default:
        return "bg-zinc-100 text-zinc-600 border-zinc-200";
    }
  }

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Season 1 Active
          </span>
          <span className="text-xs text-zinc-500 font-bold">Midnight UTC Reset</span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">The Arena</h1>
        <p className="text-zinc-600 text-sm font-medium">Quantified Leaderboard & Stake Pool</p>
      </div>

      {/* Scope Switcher: Global vs Squad */}
      <div className="liquid-glass rounded-2xl p-1.5 flex gap-1">
        <button
          onClick={() => setScope("global")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            scope === "global" ? "bg-white/40 text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>Global Arena</span>
        </button>
        <button
          onClick={() => setScope("squad")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            scope === "squad" ? "bg-white/40 text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Users className="w-3.5 h-3.5 text-emerald-600" />
          <span>Squad Circle</span>
        </button>
      </div>

      {/* Skin-in-the-Game Stake Pool Card */}
      <div className="liquid-glass rounded-3xl p-5 space-y-3 relative overflow-hidden">
        {/* Subtle amber glow inside the glass */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -z-10" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-zinc-900">Weekly Community Pool</span>
          </div>
          <span className="text-xs font-extrabold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            ₹{estimatedPoolInr} INR
          </span>
        </div>

        <p className="text-xs text-zinc-700 font-medium leading-relaxed">
          Funded by the ₹10 weekly commitment. Operators who hit ≥85% compliance preserve their stake. The remainder is unlocked by the podium leaders.
        </p>

        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-200/50 text-center">
          <div className="p-2 rounded-xl bg-white/30 border border-white/40">
            <p className="text-[9px] font-bold text-zinc-500 uppercase">1st Place</p>
            <p className="text-xs font-black text-amber-600">50% Pool</p>
          </div>
          <div className="p-2 rounded-xl bg-white/30 border border-white/40">
            <p className="text-[9px] font-bold text-zinc-500 uppercase">2nd Place</p>
            <p className="text-xs font-black text-zinc-700">30% Pool</p>
          </div>
          <div className="p-2 rounded-xl bg-white/30 border border-white/40">
            <p className="text-[9px] font-bold text-zinc-500 uppercase">3rd Place</p>
            <p className="text-xs font-black text-amber-800">20% Pool</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="pt-16 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <p className="text-xs text-zinc-500 font-medium">Auditing Arena Scores...</p>
        </div>
      ) : (
        <>
          {/* PODIUM: TOP 3 OPERATORS */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-3 gap-2 items-end pt-4 pb-2">
              {/* 2nd Place */}
              {topThree[1] && (
                <div className="liquid-glass rounded-3xl p-3 flex flex-col items-center text-center space-y-2 h-36 justify-between">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-2xl bg-zinc-200 text-zinc-800 flex items-center justify-center font-black text-sm">
                      {(topThree[1].handle || "O").charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-300 text-zinc-800 font-black text-[10px] flex items-center justify-center border-2 border-white/50">
                      2
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900 truncate max-w-[80px]">
                      @{topThree[1].handle || "operator"}
                    </p>
                    <p className="text-[10px] font-black text-emerald-600">{topThree[1].aura_points} AP</p>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-500 flex items-center gap-0.5">
                    <Flame className="w-3 h-3 text-orange-500" />
                    {topThree[1].current_streak}d
                  </span>
                </div>
              )}

              {/* 1st Place Champion */}
              {topThree[0] && (
                <div className="liquid-glass rounded-3xl p-3 flex flex-col items-center text-center space-y-2 h-44 justify-between relative overflow-hidden !border-amber-400/40">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
                  <div className="relative">
                    <div className="w-13 h-13 rounded-2xl bg-zinc-900 text-amber-400 flex items-center justify-center font-black text-base shadow-md">
                      {(topThree[0].handle || "O").charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-amber-400 text-zinc-900 font-black text-xs flex items-center justify-center border-2 border-white shadow-xs">
                      1
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-900 truncate max-w-[90px]">
                      @{topThree[0].handle || "operator"}
                    </p>
                    <p className="text-[11px] font-black text-emerald-600">{topThree[0].aura_points} AP</p>
                  </div>
                  <span className="text-[10px] font-extrabold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Leader
                  </span>
                </div>
              )}

              {/* 3rd Place */}
              {topThree[2] && (
                <div className="liquid-glass rounded-3xl p-3 flex flex-col items-center text-center space-y-2 h-32 justify-between">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-black text-xs">
                      {(topThree[2].handle || "O").charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-600 text-white font-black text-[10px] flex items-center justify-center border-2 border-white/50">
                      3
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900 truncate max-w-[80px]">
                      @{topThree[2].handle || "operator"}
                    </p>
                    <p className="text-[10px] font-black text-emerald-600">{topThree[2].aura_points} AP</p>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-500 flex items-center gap-0.5">
                    <Flame className="w-3 h-3 text-orange-500" />
                    {topThree[2].current_streak}d
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STANDINGS LIST (Ranks 4+) */}
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1">
              Active Arena Standings ({operators.length})
            </h2>

            {operators.length === 0 ? (
              <div className="liquid-glass p-8 rounded-3xl text-center space-y-2">
                <Shield className="w-8 h-8 text-zinc-400 mx-auto" />
                <p className="text-sm font-bold text-zinc-800">No operators in this circle</p>
                <p className="text-xs text-zinc-500">Invite squad members to populate this leaderboard.</p>
              </div>
            ) : (
              restOperators.map((op, idx) => {
                const rankNumber = idx + 4;
                const isCurrentUser = op.id === currentUserId;

                return (
                  <div
                    key={op.id}
                    className={`liquid-glass rounded-2xl p-3.5 flex items-center justify-between transition-all ${
                      isCurrentUser ? "!border-emerald-500/40 shadow-sm" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs font-black text-zinc-500 tabular-nums">
                        #{rankNumber}
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
                        {(op.handle || "O").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-zinc-900">
                            @{op.handle || "operator"}
                          </p>
                          {isCurrentUser && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-600 text-white rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${getRankBadgeColor(op.identity_rank)}`}>
                            {op.identity_rank || "Initiate"}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-medium">
                            • {op.current_streak || 0}d streak
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-zinc-900 tabular-nums flex items-center gap-1 justify-end">
                        <Sparkles className="w-3 h-3 text-emerald-500" />
                        {op.aura_points}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">AP Score</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

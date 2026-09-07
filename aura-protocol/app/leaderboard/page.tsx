"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { 
  Trophy, 
  Flame, 
  Sparkles, 
  Globe, 
  Users, 
  Crown, 
  Award, 
  Loader2 
} from "lucide-react";

interface OperatorEntry {
  id: string;
  name: string;
  handle: string;
  totalAura: number;
  daysLogged: number;
  streak: number;
  rankTitle: string;
  badgeColor: string;
}

export default function LeaderboardPage() {
  const [scope, setScope] = useState<"global" | "squad">("global");
  const [globalList, setGlobalList] = useState<OperatorEntry[]>([]);
  const [squadList, setSquadList] = useState<OperatorEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setCurrentUserId(user.id);

    // 1. Fetch all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, handle, aura_points, identity_rank, current_streak");

    // 2. Fetch all daily logs for legacy and activity aggregation
    const { data: logs } = await supabase
      .from("daily_logs")
      .select("user_id, gym_done, editing_done, meals_logged, ap_earned");

    // 3. Fetch user's squad connections
    const { data: friendships } = await supabase
      .from("friendships")
      .select("user_id, friend_id")
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    const squadIds = new Set<string>([user.id]);
    (friendships || []).forEach((f: any) => {
      squadIds.add(f.user_id);
      squadIds.add(f.friend_id);
    });

    // 4. Calculate points from logs
    const userLogStats = new Map<string, { totalFromLogs: number; daysLogged: number }>();
    (logs || []).forEach((log: any) => {
      const uid = log.user_id;
      if (!uid) return;

      if (!userLogStats.has(uid)) {
        userLogStats.set(uid, { totalFromLogs: 0, daysLogged: 0 });
      }

      const entry = userLogStats.get(uid)!;
      entry.daysLogged += 1;

      const gymPoints = log.gym_done ? 25 : 0;
      const workPoints = log.editing_done ? 25 : 0;
      const mealPoints = ((log.meals_logged || 0) / 5) * 25;
      const loggedAp = log.ap_earned || 0;

      entry.totalFromLogs += Math.max(gymPoints + workPoints + mealPoints, loggedAp);
    });

    // 5. Build unified leaderboard with Protocol Identity Ranks
    const compiledList: OperatorEntry[] = (profiles || []).map((p: any) => {
      const stats = userLogStats.get(p.id) || { totalFromLogs: 0, daysLogged: 0 };
      const storedAP = p.aura_points || 0;
      const totalAura = Math.max(storedAP, Math.round(stats.totalFromLogs));

      let rankTitle = "Initiate";
      let badgeColor = "bg-zinc-100 text-zinc-600 border-zinc-200";

      if (totalAura >= 2000) {
        rankTitle = "Apex";
        badgeColor = "bg-amber-500/10 text-amber-700 border-amber-500/30";
      } else if (totalAura >= 1000) {
        rankTitle = "Elite";
        badgeColor = "bg-purple-500/10 text-purple-700 border-purple-500/30";
      } else if (totalAura >= 500) {
        rankTitle = "Operator";
        badgeColor = "bg-blue-500/10 text-blue-700 border-blue-500/30";
      } else if (totalAura >= 200) {
        rankTitle = "Disciplined";
        badgeColor = "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
      }

      return {
        id: p.id,
        name: p.full_name || p.handle || "Operator",
        handle: p.handle || `operator_${p.id.slice(0, 4)}`,
        totalAura,
        daysLogged: stats.daysLogged,
        streak: p.current_streak || 0,
        rankTitle: p.identity_rank || rankTitle,
        badgeColor,
      };
    });

    // Sort descending by total points
    compiledList.sort((a, b) => b.totalAura - a.totalAura);

    setGlobalList(compiledList);
    setSquadList(compiledList.filter((op) => squadIds.has(op.id)));
    setLoading(false);
  }

  const activeList = scope === "global" ? globalList : squadList;
  const topThree = activeList.slice(0, 3);
  const remainingOperators = activeList.slice(3);

  const currentUserIndex = activeList.findIndex((op) => op.id === currentUserId);
  const currentUserRank = currentUserIndex !== -1 ? currentUserIndex + 1 : null;
  const currentOperator = currentUserIndex !== -1 ? activeList[currentUserIndex] : null;

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Leaderboard</h1>
        <p className="text-zinc-500 text-sm font-medium">Quantified Operator Arena</p>
      </div>

      {/* Scope Switcher Tabs */}
      <div className="liquid-glass rounded-2xl p-1.5 flex gap-1 border border-white/80 shadow-sm bg-zinc-200/50 backdrop-blur-md">
        <button
          onClick={() => setScope("global")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            scope === "global" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Global Arena ({globalList.length})</span>
        </button>
        <button
          onClick={() => setScope("squad")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            scope === "squad" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Squad Circle ({squadList.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="pt-20 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <p className="text-xs text-zinc-400 font-medium">Syncing Protocol Standings...</p>
        </div>
      ) : activeList.length === 0 ? (
        <div className="liquid-glass p-8 rounded-3xl text-center space-y-2 border border-white/80 bg-white/60">
          <Award className="w-8 h-8 text-zinc-300 mx-auto" />
          <p className="text-sm font-bold text-zinc-700">No rankings available</p>
          <p className="text-xs text-zinc-400">
            {scope === "squad"
              ? "Add fellow operators to your Squad to compare standings."
              : "Rankings will populate as operators log daily pillars."}
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium Layout */}
          <div className="grid grid-cols-3 gap-2 pt-4 items-end">
            {/* Rank 2 (Silver) */}
            {topThree[1] && (
              <div className="liquid-glass rounded-3xl p-3 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 flex flex-col items-center text-center space-y-1.5 pb-4">
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-zinc-200 text-zinc-800 flex items-center justify-center font-black text-xs">
                    {topThree[1].name.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-zinc-400 text-white font-black text-[9px] rounded-full">
                    #2
                  </span>
                </div>
                <p className="text-xs font-bold text-zinc-900 truncate w-full">{topThree[1].name}</p>
                <span className="text-[10px] font-black text-emerald-600 flex items-center gap-0.5">
                  <Flame className="w-3 h-3 text-emerald-500" /> {topThree[1].totalAura}
                </span>
              </div>
            )}

            {/* Rank 1 (Gold Peak) */}
            {topThree[0] && (
              <div className="liquid-glass rounded-3xl p-4 border border-amber-300/80 shadow-md backdrop-blur-xl bg-amber-500/10 flex flex-col items-center text-center space-y-1.5 pb-6 scale-105">
                <Crown className="w-5 h-5 text-amber-500" />
                <div className="relative">
                  <div className="w-13 h-13 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-md">
                    {topThree[0].name.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-1 -right-1 px-2 py-0.2 bg-amber-600 text-white font-black text-[10px] rounded-full border border-white">
                    #1
                  </span>
                </div>
                <p className="text-xs font-black text-zinc-900 truncate w-full">{topThree[0].name}</p>
                <span className="text-xs font-black text-emerald-600 flex items-center gap-0.5">
                  <Sparkles className="w-3.5 h-3.5" /> {topThree[0].totalAura} AP
                </span>
              </div>
            )}

            {/* Rank 3 (Bronze) */}
            {topThree[2] && (
              <div className="liquid-glass rounded-3xl p-3 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 flex flex-col items-center text-center space-y-1.5 pb-4">
                <div className="relative">
                  <div className="w-11 h-11 rounded-2xl bg-amber-700/20 text-amber-800 flex items-center justify-center font-black text-xs">
                    {topThree[2].name.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-amber-700 text-white font-black text-[9px] rounded-full">
                    #3
                  </span>
                </div>
                <p className="text-xs font-bold text-zinc-900 truncate w-full">{topThree[2].name}</p>
                <span className="text-[10px] font-black text-emerald-600 flex items-center gap-0.5">
                  <Flame className="w-3 h-3 text-emerald-500" /> {topThree[2].totalAura}
                </span>
              </div>
            )}
          </div>

          {/* Remaining Operator Rows */}
          <div className="space-y-2 pt-2">
            {remainingOperators.map((operator, index) => {
              const rank = index + 4;
              const isCurrentUser = operator.id === currentUserId;

              return (
                <div
                  key={operator.id}
                  className={`liquid-glass p-3.5 rounded-2xl flex items-center justify-between border transition-all ${
                    isCurrentUser
                      ? "border-emerald-500/50 bg-emerald-500/[0.06] shadow-sm"
                      : "border-white/80 bg-white/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-black text-zinc-400">
                      #{rank}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700 font-bold text-xs">
                      {operator.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-zinc-900">{operator.name}</p>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold border ${operator.badgeColor}`}>
                          {operator.rankTitle}
                        </span>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500 text-white rounded-md font-black">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 font-medium">
                        @{operator.handle} • {operator.daysLogged}d active • {operator.streak}d streak
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-600 tabular-nums flex items-center justify-end gap-1">
                      <Flame className="w-3.5 h-3.5 text-emerald-500" />
                      {operator.totalAura} AP
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pinned Current User Standing Dock (If ranked outside top 3) */}
          {currentOperator && currentUserRank && currentUserRank > 3 && (
            <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto">
              <div className="liquid-glass rounded-2xl p-3.5 border border-emerald-500/40 shadow-2xl backdrop-blur-2xl bg-zinc-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center text-xs font-black text-emerald-400">
                    #{currentUserRank}
                  </span>
                  <div>
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <span>Your Standing</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-bold">
                        {currentOperator.rankTitle}
                      </span>
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {currentOperator.daysLogged} days logged • {currentOperator.streak}d streak
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> {currentOperator.totalAura} AP
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

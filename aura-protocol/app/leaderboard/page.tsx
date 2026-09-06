import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Trophy, Flame, Award, Shield, Zap } from "lucide-react";

export default async function LeaderboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  const { data: logs } = await supabase
    .from('daily_logs')
    .select('user_id, gym_done, editing_done, meals_logged');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url');

  const profileMap = new Map();
  (profiles || []).forEach((p) => profileMap.set(p.id, p));

  const userScores = new Map();

  (logs || []).forEach((log) => {
    const userId = log.user_id;
    if (!userId) return;

    if (!userScores.has(userId)) {
      userScores.set(userId, { totalAura: 0, daysLogged: 0 });
    }

    const entry = userScores.get(userId);
    entry.daysLogged += 1;

    const gymPoints = log.gym_done ? 25 : 0;
    const workPoints = log.editing_done ? 25 : 0;
    const mealPoints = ((log.meals_logged || 0) / 5) * 25;
    entry.totalAura += gymPoints + workPoints + mealPoints;
  });

  const leaderboard: any[] = [];
  userScores.forEach((stats, userId) => {
    const profile = profileMap.get(userId) || {};
    const totalAura = Math.round(stats.totalAura);

    // Immersive Title Tiers
    let title = "🌱 Rookie";
    let badgeColor = "bg-zinc-100 text-zinc-600 border-zinc-200";
    if (totalAura >= 200) {
      title = "🔥 Final Boss";
      badgeColor = "bg-amber-500/10 text-amber-600 border-amber-500/30";
    } else if (totalAura >= 100) {
      title = "⚡ Elite Operator";
      badgeColor = "bg-blue-500/10 text-blue-600 border-blue-500/30";
    } else if (totalAura >= 50) {
      title = "🛡️ Veteran";
      badgeColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
    }

    leaderboard.push({
      id: userId,
      name: profile.full_name || "Aura Operator",
      totalAura,
      daysLogged: stats.daysLogged,
      title,
      badgeColor,
    });
  });

  leaderboard.sort((a, b) => b.totalAura - a.totalAura);

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Leaderboard</h1>
        <p className="text-zinc-500 text-sm font-medium">Global Operator Rankings & Tiers</p>
      </div>

      <div className="space-y-3">
        {leaderboard.length > 0 ? (
          leaderboard.map((operator, index) => {
            const rank = index + 1;
            const isCurrentUser = operator.id === user.id;

            return (
              <div 
                key={operator.id} 
                className={`liquid-glass p-4 rounded-3xl flex items-center justify-between border ${
                  isCurrentUser ? 'border-emerald-500/50 bg-emerald-500/[0.03]' : 'border-white/80'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm ${
                    rank === 1 ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' :
                    rank === 2 ? 'bg-zinc-300 text-zinc-800' :
                    rank === 3 ? 'bg-amber-700/60 text-white' : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {rank === 1 ? <Trophy className="w-4 h-4" /> : `#${rank}`}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-zinc-900">{operator.name}</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${operator.badgeColor}`}>
                        {operator.title}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-medium">{operator.daysLogged} Days Tracked {isCurrentUser && "• (You)"}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600 tabular-nums flex items-center justify-end gap-1">
                    <Flame className="w-4 h-4 text-emerald-500" />
                    {operator.totalAura} pts
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="liquid-glass p-8 rounded-3xl text-center space-y-2">
            <Award className="w-8 h-8 text-zinc-300 mx-auto" />
            <p className="text-sm font-bold text-zinc-700">No rankings available yet</p>
            <p className="text-xs text-zinc-400">Rankings will populate as operators complete daily logs.</p>
          </div>
        )}
      </div>
    </div>
  );
}

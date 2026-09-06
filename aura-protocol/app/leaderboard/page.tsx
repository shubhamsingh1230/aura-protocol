import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Trophy, Flame, Award } from "lucide-react";

export default async function RanksPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  // Fetch profiles and their daily logs
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      avatar_url,
      daily_logs (
        gym_done,
        editing_done,
        meals_logged
      )
    `);

  if (error) {
    console.error("Error fetching leaderboard data:", error.message);
  }

  // Calculate total cumulative Aura points for each user
  const leaderboard = (profiles || []).map((profile: any) => {
    const logs = profile.daily_logs || [];
    
    const totalAura = logs.reduce((acc: number, log: any) => {
      const gymPoints = log.gym_done ? 25 : 0;
      const workPoints = log.editing_done ? 25 : 0;
      const mealPoints = ((log.meals_logged || 0) / 5) * 25;
      return acc + gymPoints + workPoints + mealPoints;
    }, 0);

    return {
      id: profile.id,
      name: profile.full_name || "Aura Operator",
      totalAura: Math.round(totalAura),
      daysLogged: logs.length
    };
  });

  // Sort leaderboard descending by total Aura points
  leaderboard.sort((a, b) => b.totalAura - a.totalAura);

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Leaderboard</h1>
        <p className="text-zinc-500 text-sm font-medium">Global Operator Rankings</p>
      </div>

      <div className="space-y-3">
        {leaderboard.length > 0 ? (
          leaderboard.map((operator, index) => {
            const rank = index + 1;
            const isTopThree = rank <= 3;
            const isCurrentUser = operator.id === user.id;

            return (
              <div 
                key={operator.id} 
                className={`liquid-glass p-4 rounded-3xl flex items-center justify-between border ${
                  isCurrentUser ? 'border-emerald-500/50 bg-emerald-500/[0.03]' : 'border-white/[0.8]'
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
                    <p className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                      {operator.name} {isCurrentUser && <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">You</span>}
                    </p>
                    <p className="text-xs text-zinc-400 font-medium">{operator.daysLogged} Days Tracked</p>
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

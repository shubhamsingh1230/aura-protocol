import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar, BarChart3 } from "lucide-react";

export default async function HistoryPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  // Fetch all time logs for this user
  const { data: timeLogs } = await supabase
    .from("time_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch past 30 days of daily logs for consistency overview
  const { data: dailyLogs } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("log_date", { ascending: false })
    .limit(30);

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/dashboard" className="p-2 bg-white/[0.6] rounded-full border border-zinc-200 text-zinc-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Performance History</h1>
          <p className="text-zinc-500 text-xs font-medium">Deep Work & Training Breakdown</p>
        </div>
      </div>

      {/* Time Logs List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1 flex items-center gap-1.5">
          <Clock className="w-4 h-4" /> Recorded Time Sessions
        </h2>
        
        {timeLogs && timeLogs.length > 0 ? (
          timeLogs.map((log) => {
            const hours = Math.floor(log.duration_seconds / 3600);
            const minutes = Math.floor((log.duration_seconds % 3600) / 60);
            const durationFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

            return (
              <div key={log.id} className="liquid-glass p-4 rounded-2xl flex items-center justify-between border border-white/[0.8]">
                <div>
                  <p className="text-sm font-bold text-zinc-800 capitalize">{log.activity.replace('_', ' ')}</p>
                  <p className="text-xs text-zinc-400 font-medium">{log.log_date}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-600 tabular-nums">{durationFormatted}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="liquid-glass p-6 rounded-2xl text-center text-zinc-400 text-sm">
            No time sessions recorded yet. Use the Timer tab to log work.
          </div>
        )}
      </div>

      {/* Daily Logs / Consistency Breakdown */}
      <div className="space-y-3 mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1 flex items-center gap-1.5">
          <Calendar className="w-4 h-4" /> Past 30 Days Record
        </h2>

        <div className="liquid-glass rounded-3xl p-4 space-y-2 border border-white/[0.8]">
          {dailyLogs?.map((day) => (
            <div key={day.id} className="flex items-center justify-between py-2 border-b border-black/[0.03] last:border-none">
              <span className="text-xs font-semibold text-zinc-600">{day.log_date}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${day.gym_done ? 'bg-emerald-500/10 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}>
                  Gym
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${day.editing_done ? 'bg-blue-500/10 text-blue-600' : 'bg-zinc-100 text-zinc-400'}`}>
                  Work
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${day.meals_logged === 5 ? 'bg-orange-500/10 text-orange-600' : 'bg-zinc-100 text-zinc-400'}`}>
                  Meals ({day.meals_logged}/5)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

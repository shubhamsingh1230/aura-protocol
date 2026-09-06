import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, Clock, Dumbbell, MonitorPlay, Flame } from "lucide-react";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  // Determine active pillar: 'work' (Deep Work / Grind) or 'gym' (Training / Workout)
  const currentTab = searchParams?.tab === "work" ? "work" : "gym";
  const activityKey = currentTab === "work" ? "editing_deep_work" : "gym_workout";
  const isWork = currentTab === "work";

  // 1. Fetch strictly separated data from time_logs for this activity
  const { data: rawLogs } = await supabase
    .from("time_logs")
    .select("id, duration_seconds, log_date, created_at")
    .eq("user_id", user.id)
    .eq("activity", activityKey)
    .order("log_date", { ascending: true });

  const logs = rawLogs || [];

  // 2. Aggregate metrics
  const totalSeconds = logs.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);
  const totalMinutes = Math.round(totalSeconds / 60);

  // 3. Build Last 7 Days Visual Bar Chart Data
  const last7Days: { label: string; dateStr: string; minutes: number; heightPercent: number }[] = [];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = daysOfWeek[d.getDay()];

    // Sum minutes logged on this specific day
    const daySeconds = logs
      .filter((l) => (l.log_date === dateStr || l.created_at?.startsWith(dateStr)))
      .reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
    
    last7Days.push({
      label: dayLabel,
      dateStr,
      minutes: Math.round(daySeconds / 60),
      heightPercent: 0, // calculated below
    });
  }

  // Find max minutes for relative scaling (minimum ceiling 60 mins so empty charts look proportional)
  const maxDayMinutes = Math.max(...last7Days.map((d) => d.minutes), 60);
  last7Days.forEach((d) => {
    d.heightPercent = Math.min(100, Math.round((d.minutes / maxDayMinutes) * 100));
  });

  // 4. Circular Progress / Goal Ring (e.g., Weekly Target: 10 hrs = 600 mins)
  const weeklyTargetMins = isWork ? 600 : 300; // 10 hrs work, 5 hrs gym target
  const weeklyAchievedMins = last7Days.reduce((acc, d) => acc + d.minutes, 0);
  const goalPercent = Math.min(100, Math.round((weeklyAchievedMins / weeklyTargetMins) * 100));

  const ringRadius = 38;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (goalPercent / 100) * ringCircumference;

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2.5 bg-white/80 rounded-2xl border border-zinc-200/80 shadow-sm text-zinc-700 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
            {isWork ? "Deep Work & Grind" : "Training & Gym"}
          </h1>
          <p className="text-zinc-500 text-xs font-medium">Activity Analytics & Performance</p>
        </div>
      </div>

      {/* Pill Switcher Tabs */}
      <div className="flex p-1.5 bg-zinc-100 rounded-2xl border border-zinc-200">
        <Link
          href="/history?tab=work"
          className={`flex-1 py-2.5 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            isWork
              ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <MonitorPlay className="w-3.5 h-3.5" /> Grind
        </Link>
        <Link
          href="/history?tab=gym"
          className={`flex-1 py-2.5 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            !isWork
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <Dumbbell className="w-3.5 h-3.5" /> Workout
        </Link>
      </div>

      {/* VISUAL CHART 1: 7-Day Performance Bar Graph */}
      <div className="liquid-glass rounded-3xl p-5 border border-white/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">7-Day Volume</p>
            <p className="text-xl font-black text-zinc-900 tracking-tight">
              {weeklyAchievedMins} <span className="text-xs text-zinc-500 font-semibold">minutes</span>
            </p>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isWork ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
            }`}
          >
            {isWork ? "Focus Trend" : "Lift Trend"}
          </span>
        </div>

        {/* Visual Dynamic Bar Chart */}
        <div className="h-40 flex items-end justify-between gap-2.5 pt-4 pb-1 px-1 border-b border-zinc-100">
          {last7Days.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
              {/* Tooltip on hover */}
              <span className="text-[10px] font-bold text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1 tabular-nums">
                {day.minutes}m
              </span>
              
              {/* Bar track */}
              <div className="w-full bg-zinc-100 rounded-xl h-full flex items-end justify-center overflow-hidden p-0.5">
                <div
                  style={{ height: `${Math.max(8, day.heightPercent)}%` }}
                  className={`w-full rounded-lg transition-all duration-700 ease-out ${
                    day.minutes > 0
                      ? isWork
                        ? "bg-blue-500 shadow-sm shadow-blue-500/30"
                        : "bg-emerald-500 shadow-sm shadow-emerald-500/30"
                      : "bg-zinc-200"
                  }`}
                />
              </div>
              <span className="text-[11px] font-bold text-zinc-400 mt-2">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* VISUAL CHART 2: Goal Target Radial Progress Ring */}
      <div className="liquid-glass rounded-3xl p-5 border border-white/80 shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Target Completion</p>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{goalPercent}%</h2>
          <p className="text-xs text-zinc-500 font-medium">
            {weeklyAchievedMins} of {weeklyTargetMins} min weekly goal
          </p>
          <div className="pt-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
            <Flame className={`w-4 h-4 ${isWork ? "text-blue-500" : "text-emerald-500"}`} />
            {totalHours} Total Hours Logged
          </div>
        </div>

        {/* Circular Progress Meter */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 90 90">
            <circle
              cx="45"
              cy="45"
              r={ringRadius}
              fill="transparent"
              stroke="rgba(0,0,0,0.06)"
              strokeWidth="8"
            />
            <circle
              cx="45"
              cy="45"
              r={ringRadius}
              fill="transparent"
              stroke={isWork ? "#3b82f6" : "#10b981"}
              strokeWidth="8"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-black text-zinc-800">{goalPercent}%</span>
            <span className="text-[9px] uppercase font-bold text-zinc-400">Goal</span>
          </div>
        </div>
      </div>

      {/* Recent Session Log Entries */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Recent {isWork ? "Deep Work" : "Workout"} Entries
        </h3>

        {logs.length > 0 ? (
          logs.slice(-5).reverse().map((log) => {
            const h = Math.floor(log.duration_seconds / 3600);
            const m = Math.floor((log.duration_seconds % 3600) / 60);
            const durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

            return (
              <div
                key={log.id}
                className="liquid-glass p-4 rounded-2xl flex items-center justify-between border border-white/80 shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-zinc-800">
                    {isWork ? "Focus Session" : "Training Block"}
                  </p>
                  <p className="text-xs text-zinc-400 font-medium">{log.log_date}</p>
                </div>
                <div
                  className={`text-sm font-black tabular-nums ${
                    isWork ? "text-blue-600" : "text-emerald-600"
                  }`}
                >
                  {durationStr}
                </div>
              </div>
            );
          })
        ) : (
          <div className="liquid-glass p-6 rounded-2xl text-center text-zinc-400 text-xs font-medium">
            No {isWork ? "deep work" : "workout"} entries found yet. Use the timer or check-in to log your first session!
          </div>
        )}
      </div>
    </div>
  );
}

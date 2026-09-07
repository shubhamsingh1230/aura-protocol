// app/autopsy/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  ShieldAlert, 
  Loader2, 
  ArrowRight,
  Sparkles,
  ClipboardList
} from "lucide-react";

interface AutopsyRecord {
  id: string;
  pillar_failed: string;
  root_cause: string;
  countermeasure: string;
  created_at: string;
}

interface FailureStats {
  totalMissed: number;
  missedGym: number;
  missedWork: number;
  missedMeals: number;
  vulnerabilityRate: number;
}

export default function AutopsyPage() {
  const [autopsies, setAutopsies] = useState<AutopsyRecord[]>([]);
  const [stats, setStats] = useState<FailureStats>({
    totalMissed: 0,
    missedGym: 0,
    missedWork: 0,
    missedMeals: 0,
    vulnerabilityRate: 0,
  });
  const [pillarFailed, setPillarFailed] = useState("Training (Movement)");
  const [rootCause, setRootCause] = useState("");
  const [countermeasure, setCountermeasure] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadAutopsyData();
  }, []);

  async function loadAutopsyData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch historical failure post-mortems
    const { data: pastAutopsies } = await supabase
      .from("autopsies")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setAutopsies(pastAutopsies || []);

    // 2. Fetch past 30 days daily logs to diagnose vulnerability rates
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: monthLogs } = await supabase
      .from("daily_logs")
      .select("gym_done, editing_done, meals_logged, workout, deep_work")
      .eq("user_id", user.id)
      .gte("log_date", thirtyDaysAgo.toISOString().split("T")[0]);

    let missedGym = 0;
    let missedWork = 0;
    let missedMeals = 0;
    const trackedDays = monthLogs?.length || 1;

    (monthLogs || []).forEach((day: any) => {
      if (!day.gym_done && !day.workout) missedGym++;
      if (!day.editing_done && !day.deep_work) missedWork++;
      if ((day.meals_logged || 0) < 5) missedMeals++;
    });

    const totalMissed = missedGym + missedWork + missedMeals;
    const totalPillarsExpected = trackedDays * 3;
    const failurePercentage = Math.round((totalMissed / (totalPillarsExpected || 1)) * 100);

    setStats({
      totalMissed,
      missedGym,
      missedWork,
      missedMeals,
      vulnerabilityRate: Math.min(100, failurePercentage),
    });

    setLoading(false);
  }

  async function handleFileAutopsy(e: React.FormEvent) {
    e.preventDefault();
    if (!rootCause.trim() || !countermeasure.trim()) return;

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("autopsies")
      .insert({
        user_id: user.id,
        pillar_failed: pillarFailed,
        root_cause: rootCause.trim(),
        countermeasure: countermeasure.trim(),
      })
      .select()
      .single();

    if (error) {
      alert(`Failed to save autopsy: ${error.message}`);
    } else {
      setAutopsies((prev) => [data, ...prev]);
      setRootCause("");
      setCountermeasure("");
      alert("Post-mortem recorded. Countermeasure committed to memory.");
    }
    setSubmitting(false);
  }

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">The Autopsy</h1>
        <p className="text-zinc-500 text-sm font-medium">Failure Diagnostics & Root-Cause Protocol</p>
      </div>

      {loading ? (
        <div className="pt-24 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <p className="text-xs text-zinc-400 font-medium">Diagnosing Vulnerabilities...</p>
        </div>
      ) : (
        <>
          {/* Diagnostic Metrics Overview */}
          <div className="liquid-glass rounded-3xl p-5 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4" />
                <span>30-Day Slippage Risk</span>
              </div>
              <span className="text-xs font-bold text-zinc-400">Past 30 Days</span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-zinc-900 tabular-nums">
                {stats.vulnerabilityRate}%
              </span>
              <span className="text-xs font-bold text-zinc-500">
                {stats.totalMissed} Broken Disciplines
              </span>
            </div>

            {/* Pillar Slippage Breakdown */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100 text-center">
              <div className="p-2.5 rounded-2xl bg-zinc-100/60 border border-zinc-200/50">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Movement</p>
                <p className="text-sm font-black text-zinc-800 tabular-nums">{stats.missedGym} missed</p>
              </div>
              <div className="p-2.5 rounded-2xl bg-zinc-100/60 border border-zinc-200/50">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Deep Work</p>
                <p className="text-sm font-black text-zinc-800 tabular-nums">{stats.missedWork} missed</p>
              </div>
              <div className="p-2.5 rounded-2xl bg-zinc-100/60 border border-zinc-200/50">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Nutrition</p>
                <p className="text-sm font-black text-zinc-800 tabular-nums">{stats.missedMeals} missed</p>
              </div>
            </div>
          </div>

          {/* Form: File a Post-Mortem */}
          <div className="liquid-glass rounded-3xl p-5 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 space-y-4">
            <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              <span>Record a Failure Post-Mortem</span>
            </div>

            <form onSubmit={handleFileAutopsy} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                  Which Pillar Broke Down?
                </label>
                <select
                  value={pillarFailed}
                  onChange={(e) => setPillarFailed(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-white border border-zinc-200 text-xs font-bold text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option>Physical Training (Movement)</option>
                  <option>Deep Work Block (Grind)</option>
                  <option>Nutrition Compliance (5 Meals)</option>
                  <option>Morning Protocol</option>
                  <option>Sleep Restoration (7h+)</option>
                  <option>Evening Review</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                  Root Cause Diagnosis
                </label>
                <input
                  type="text"
                  placeholder="Why did execution fail? (e.g., poor time budgeting, low energy)"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-white border border-zinc-200 text-xs font-medium text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                  Systemic Countermeasure
                </label>
                <input
                  type="text"
                  placeholder="What friction will you introduce to prevent a repeat?"
                  value={countermeasure}
                  onChange={(e) => setCountermeasure(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-white border border-zinc-200 text-xs font-medium text-zinc-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !rootCause.trim() || !countermeasure.trim()}
                className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Commit Autopsy Countermeasure</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Historical Logged Autopsies */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
              Historical Post-Mortems ({autopsies.length})
            </h2>

            {autopsies.length === 0 ? (
              <div className="liquid-glass p-6 rounded-3xl text-center space-y-1 border border-white/80 bg-white/60">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-zinc-800">Clean Operating Record</p>
                <p className="text-[11px] text-zinc-400">No behavioral autopsies logged.</p>
              </div>
            ) : (
              autopsies.map((item) => (
                <div
                  key={item.id}
                  className="liquid-glass rounded-3xl p-4 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-600">
                      {item.pillar_failed}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400">
                      {new Date(item.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-zinc-700">
                    <p>
                      <strong className="text-zinc-900">Diagnosis:</strong> {item.root_cause}
                    </p>
                    <p className="text-emerald-700 font-medium">
                      <strong className="text-zinc-900">Protocol Fix:</strong> {item.countermeasure}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

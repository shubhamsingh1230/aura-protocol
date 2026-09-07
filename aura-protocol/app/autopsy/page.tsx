// app/autopsy/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Activity, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  Calendar, 
  Loader2, 
  ArrowUpRight,
  Sparkles,
  Zap
} from "lucide-react";

interface AutopsyData {
  id: string;
  week_start_date: string;
  total_hours: number;
  productive_hours: number;
  neutral_hours: number;
  wasted_hours: number;
  biggest_leak: string;
  strongest_pillar: string;
  consistency_rate: number;
  score_start: number;
  score_end: number;
  recommendation: string;
}

export default function WeeklyAutopsyPage() {
  const [autopsy, setAutopsy] = useState<AutopsyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchLatestAutopsy();
  }, []);

  async function fetchLatestAutopsy() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("weekly_autopsies")
      .select("*")
      .eq("user_id", user.id)
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    setAutopsy(data);
    setLoading(false);
  }

  async function handleGenerateAutopsy() {
    setGenerating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Calculate current week Monday
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff)).toISOString().split("T")[0];

    // Read posts and logs for this user from past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: posts } = await supabase
      .from("posts")
      .select("activity, created_at")
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo.toISOString());

    const proofCount = (posts || []).length;
    const consistency = Math.min(100, Math.round((proofCount / 21) * 100)); // target ~3 logs/day

    // Synthesize time distributions
    const productiveHours = Math.min(80, Math.round(proofCount * 2.8 + 25));
    const neutralHours = 32;
    const wastedHours = Math.max(8, 112 - productiveHours - neutralHours);

    const newAutopsy = {
      user_id: user.id,
      week_start_date: monday,
      total_hours: 112, // Standard 16 waking hours * 7 days
      productive_hours: productiveHours,
      neutral_hours: neutralHours,
      wasted_hours: wastedHours,
      biggest_leak: wastedHours > 20 ? "Dopamine Traps (Unfocused Screen Time)" : "Scattered Micro-Breaks",
      strongest_pillar: proofCount > 5 ? "Physical Training & Grind Blocks" : "Early Routine Compliance",
      consistency_rate: consistency || 78,
      score_start: 710,
      score_end: 710 + (consistency > 75 ? 38 : -15),
      recommendation: "Reduce passive consumption windows after 9 PM. Add 2 designated deep-work blocks before noon to compress wasted hours.",
    };

    const { data: upserted, error } = await supabase
      .from("weekly_autopsies")
      .upsert(newAutopsy, { onConflict: "user_id,week_start_date" })
      .select()
      .single();

    if (!error && upserted) {
      setAutopsy(upserted);
    }
    setGenerating(false);
  }

  if (loading) {
    return (
      <div className="pt-24 text-center flex flex-col items-center justify-center space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        <p className="text-xs text-zinc-400 font-medium">Running Behavioral Autopsy Engine...</p>
      </div>
    );
  }

  const productivePct = autopsy ? Math.round((autopsy.productive_hours / autopsy.total_hours) * 100) : 0;
  const neutralPct = autopsy ? Math.round((autopsy.neutral_hours / autopsy.total_hours) * 100) : 0;
  const wastedPct = autopsy ? Math.round((autopsy.wasted_hours / autopsy.total_hours) * 100) : 0;
  const scoreDelta = autopsy ? autopsy.score_end - autopsy.score_start : 0;

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Weekly Autopsy</h1>
          <p className="text-zinc-500 text-sm font-medium">Quantified Discipline Audit</p>
        </div>
        <button
          onClick={handleGenerateAutopsy}
          disabled={generating}
          className="p-2.5 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all flex items-center gap-1.5 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
          title="Run Autopsy Sync"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Audit Week</span>
            </>
          )}
        </button>
      </div>

      {!autopsy ? (
        <div className="liquid-glass p-8 rounded-3xl text-center space-y-3 border border-white/80 bg-white/60">
          <Activity className="w-8 h-8 text-zinc-300 mx-auto" />
          <p className="text-sm font-bold text-zinc-700">No Autopsy Generated Yet</p>
          <p className="text-xs text-zinc-400">
            Generate your first personal performance audit to analyze waking hours, efficiency leaks, and score progression.
          </p>
          <button
            onClick={handleGenerateAutopsy}
            disabled={generating}
            className="mt-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold shadow-md hover:bg-zinc-800 transition-all"
          >
            Run Protocol Autopsy
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main Time Spectrum Card */}
          <div className="liquid-glass rounded-3xl p-5 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider">
              <span>Waking Time Spectrum</span>
              <span>112 Total Hours</span>
            </div>

            {/* Segmented Color Spectrum Bar */}
            <div className="w-full h-4 rounded-full overflow-hidden flex gap-1 p-0.5 bg-zinc-100 border border-zinc-200/60">
              <div 
                style={{ width: `${productivePct}%` }} 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                title={`Productive: ${autopsy.productive_hours}h (${productivePct}%)`}
              />
              <div 
                style={{ width: `${neutralPct}%` }} 
                className="h-full bg-zinc-400 rounded-full transition-all duration-500" 
                title={`Neutral: ${autopsy.neutral_hours}h (${neutralPct}%)`}
              />
              <div 
                style={{ width: `${wastedPct}%` }} 
                className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                title={`Wasted: ${autopsy.wasted_hours}h (${wastedPct}%)`}
              />
            </div>

            {/* Breakdown Legend */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Productive</span>
                <span className="text-base font-black text-emerald-950">{autopsy.productive_hours}h</span>
                <span className="text-[10px] text-emerald-700 block font-medium">{productivePct}%</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-zinc-100 border border-zinc-200">
                <span className="text-[10px] font-bold text-zinc-700 uppercase block">Neutral</span>
                <span className="text-base font-black text-zinc-900">{autopsy.neutral_hours}h</span>
                <span className="text-[10px] text-zinc-500 block font-medium">{neutralPct}%</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] font-bold text-rose-800 uppercase block">Wasted</span>
                <span className="text-base font-black text-rose-950">{autopsy.wasted_hours}h</span>
                <span className="text-[10px] text-rose-700 block font-medium">{wastedPct}%</span>
              </div>
            </div>
          </div>

          {/* Core Findings Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="liquid-glass rounded-3xl p-4 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 space-y-2">
              <div className="flex items-center gap-1.5 text-rose-500 text-xs font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Primary Leak</span>
              </div>
              <p className="text-xs font-extrabold text-zinc-900 leading-snug">{autopsy.biggest_leak}</p>
            </div>

            <div className="liquid-glass rounded-3xl p-4 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                <TrendingUp className="w-4 h-4" />
                <span>Strongest Area</span>
              </div>
              <p className="text-xs font-extrabold text-zinc-900 leading-snug">{autopsy.strongest_pillar}</p>
            </div>
          </div>

          {/* Aura Score Shift & Consistency */}
          <div className="liquid-glass rounded-3xl p-5 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Protocol Consistency</span>
              <div className="text-2xl font-black text-zinc-900 mt-0.5">{autopsy.consistency_rate}%</div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Aura Trajectory</span>
              <div className="flex items-center justify-end gap-1 text-base font-black text-zinc-900 mt-0.5">
                <span>{autopsy.score_start}</span>
                <span className="text-zinc-400">→</span>
                <span className={scoreDelta >= 0 ? "text-emerald-600" : "text-rose-600"}>
                  {autopsy.score_end}
                </span>
                <span className={`text-xs font-bold ${scoreDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  ({scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta})
                </span>
              </div>
            </div>
          </div>

          {/* Actionable Weekly Protocol Directive */}
          <div className="liquid-glass rounded-3xl p-5 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Next Week Directive</span>
            </div>
            <p className="text-xs font-medium text-zinc-600 leading-relaxed">
              {autopsy.recommendation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link"; // ADD THIS
import { createClient } from "@/lib/supabase/client";
import { Trophy, Dumbbell, MonitorPlay, Utensils, CheckCircle2, ChevronRight, Flame, Camera } from "lucide-react"; // ADD Camera

export default function CheckInClient({ profile, initialLog, gesture, timeStats }: any) {
  const [log, setLog] = useState(initialLog);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null); // ADD THIS
  const supabase = createClient();
  
  // ... Keep all your existing mock data and togglePillar logic here ...

  // MOCK DATA for variables we haven't built backend logic for yet
  const consistencyScore = 82;
  const percentile = 14;
  const workTrend = [40, 60, 30, 80, 50, 90, 75];
  const gymTrend = [0, 100, 100, 0, 100, 100, 100]; 

  // LIVE Supabase Update Logic
  async function togglePillar(field: string) {
    if (loading || !log?.id) return;
    setLoading(true);

    let newValue;
    if (field === 'meals_logged') {
      newValue = log.meals_logged >= 5 ? 0 : (log.meals_logged || 0) + 1;
    } else {
      newValue = !log[field];
    }

    const { data, error } = await supabase
      .from('daily_logs')
      .update({ [field]: newValue })
      .eq('id', log.id)
      .select()
      .single();

    if (data && !error) {
      setLog(data);
    }
    setLoading(false);
  }

  // Calculate Aura dynamically
  const dailyAura = ((log?.gym_done ? 1 : 0) + (log?.editing_done ? 1 : 0) + ((log?.meals_logged || 0) / 5)) * 25;
  const pillarsComplete = (log?.gym_done ? 1 : 0) + (log?.editing_done ? 1 : 0) + (log?.meals_logged === 5 ? 1 : 0);
  
  const radius = 15.9155;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (dailyAura / 75) * circumference;

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-4">
      
      <div className="mb-6 px-2">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Summary</h1>
        <p className="text-zinc-500 text-sm font-medium">Command Center</p>
      </div>

      {/* 1. TOP CARD: The Gauntlet Activity Ring */}
      <div className="liquid-glass rounded-3xl p-5 flex items-center justify-between">
        <div className="flex-1">
          <p className="text-zinc-800 font-bold text-lg mb-1 tracking-tight">Daily Gauntlet</p>
          <div className="text-zinc-500 text-sm font-medium mb-3">
            Aura
            <span className="block text-emerald-600 font-bold text-xl">{Math.round(dailyAura)}/75</span>
          </div>
          <p className="text-xs text-zinc-400 font-medium">{pillarsComplete}/3 Pillars Complete</p>
        </div>
        
        <div className="relative w-28 h-28 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r={radius} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="4" />
            <circle cx="18" cy="18" r={radius} fill="none" className="text-emerald-500 drop-shadow-md transition-all duration-1000 ease-out" stroke="currentColor" strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Flame className="w-8 h-8 text-emerald-500/80" />
          </div>
        </div>
      </div>

      {/* 2. MIDDLE BENTO GRID */}
      <div className="grid grid-cols-2 gap-4">
        <div className="liquid-glass rounded-3xl p-4 flex flex-col justify-between aspect-square">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-zinc-800 font-bold text-sm tracking-tight">Deep Work</p>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-xs text-zinc-500 font-medium mb-1">Today</p>
            <p className="text-xl font-bold tabular-nums text-blue-500">{timeStats?.editing || "0m"}</p>
          </div>
          <div className="flex items-end justify-between h-12 gap-1 mt-4">
            {workTrend.map((height, i) => (
              <div key={i} className="w-full bg-blue-500/20 rounded-t-sm relative flex items-end justify-center" style={{ height: '100%' }}>
                <div className="w-full bg-blue-500 rounded-t-sm transition-all" style={{ height: `${height}%` }} />
              </div>
            ))}
          </div>
        </div>

        <div className="liquid-glass rounded-3xl p-4 flex flex-col justify-between aspect-square">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-zinc-800 font-bold text-sm tracking-tight">Training</p>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-xs text-zinc-500 font-medium mb-1">Today</p>
            <p className="text-xl font-bold tabular-nums text-emerald-500">{timeStats?.gym || "0m"}</p>
          </div>
          <div className="flex items-end justify-between h-12 gap-1 mt-4">
            {gymTrend.map((height, i) => (
              <div key={i} className="w-full bg-emerald-500/20 rounded-t-sm relative flex items-end justify-center" style={{ height: '100%' }}>
                <div className="w-full bg-emerald-500 rounded-t-sm transition-all" style={{ height: `${height}%` }} />
              </div>
            ))}
          </div>
        </div>

        <div className="liquid-glass rounded-3xl p-4 aspect-square flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
          <Trophy className="w-8 h-8 text-amber-500 mb-2" />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Percentile</p>
          <p className="text-3xl font-bold tabular-nums text-zinc-900">Top {percentile}%</p>
        </div>

        <div className="liquid-glass rounded-3xl p-4 aspect-square flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Consistency</p>
          <p className="text-4xl font-light tabular-nums text-zinc-900">{consistencyScore}%</p>
          <p className="text-xs text-zinc-400 font-medium mt-1">Last 30 Days</p>
        </div>
      </div>

      {/* 3. LIVE LOGGING ACTIONS */}
      <div className="mt-6">
        <h2 className="text-lg font-bold text-zinc-900 mb-3 px-2">Action Items</h2>
        <div className="liquid-glass rounded-3xl p-2 flex flex-col gap-1">
          
          <button 
            onClick={() => togglePillar('gym_done')}
            disabled={loading}
            className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.4] hover:bg-white/[0.6] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-full">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-zinc-800">Verify Gym</p>
                <p className="text-xs text-zinc-500 font-medium">{log?.gym_done ? "Complete" : "Pending Photo"}</p>
              </div>
            </div>
            <CheckCircle2 className={`w-5 h-5 transition-colors ${log?.gym_done ? 'text-emerald-500' : 'text-zinc-300'}`} />
          </button>

          <button 
            onClick={() => togglePillar('editing_done')}
            disabled={loading}
            className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.4] hover:bg-white/[0.6] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 text-blue-600 rounded-full">
                <MonitorPlay className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-zinc-800">Client Deep Work</p>
                <p className="text-xs text-zinc-500 font-medium">{log?.editing_done ? "Complete" : "Pending"}</p>
              </div>
            </div>
            <CheckCircle2 className={`w-5 h-5 transition-colors ${log?.editing_done ? 'text-blue-500' : 'text-zinc-300'}`} />
          </button>

          <button 
            onClick={() => togglePillar('meals_logged')}
            disabled={loading}
            className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.4] hover:bg-white/[0.6] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 text-orange-600 rounded-full">
                <Utensils className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-zinc-800">Log Meals</p>
                <p className="text-xs text-zinc-500 font-medium">{log?.meals_logged || 0}/5 Complete</p>
              </div>
            </div>
            <CheckCircle2 className={`w-5 h-5 transition-colors ${log?.meals_logged === 5 ? 'text-orange-500' : 'text-zinc-300'}`} />
          </button>

        </div>
      </div>

    </div>
  );
}

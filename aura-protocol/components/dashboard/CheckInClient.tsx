"use client";

import { useState } from "react";
import { Activity, Clock, Trophy, Dumbbell, MonitorPlay, Utensils, CheckCircle2, ChevronRight } from "lucide-react";

export default function CheckInClient({ profile, initialLog, gesture }: any) {
  // Local state for interactive daily toggles
  const [log, setLog] = useState(initialLog);
  const [loading, setLoading] = useState(false);

  // MOCK ANALYTICS DATA (To be wired to Supabase later)
  const consistencyScore = 82; // 82%
  const percentile = 14; // Top 14%
  const timeLogged = { gym: "1h 15m", editing: "3h 45m" };
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const weekHistory = [true, true, false, true, true, false, false]; // True = hit all pillars

  async function togglePillar(field: string, value: any) {
    setLoading(true);
    // Add your Supabase update logic here (same as your old component)
    // const { data } = await supabase.from('daily_logs').update({ [field]: value }).eq('id', log.id).select().single();
    // if (data) setLog(data);
    setLoading(false);
  }

  return (
    <div className="pt-10 px-6 pb-32 min-h-screen space-y-6">
      
      {/* 1. Header & Global Standing */}
      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Command Center</p>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Welcome, {profile?.username || 'Kabir'}</h1>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full text-xs font-bold tracking-wide">
            <Trophy className="w-3.5 h-3.5" />
            TOP {percentile}%
          </div>
        </div>
      </div>

      {/* 2. The Analytics HUD (Replaces the Gauntlet) */}
      <div className="liquid-glass rounded-3xl p-6 border border-white/[0.85] shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider mb-1">Consistency</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-light tabular-nums tracking-tight text-zinc-900">{consistencyScore}</span>
              <span className="text-lg font-medium text-zinc-400">%</span>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider mb-1">Today's Aura</p>
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-4xl font-light tabular-nums tracking-tight text-emerald-600">25</span>
            </div>
          </div>
        </div>

        {/* Weekly Strike Board */}
        <div className="flex justify-between items-center relative">
          {/* Connecting Line */}
          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-black/[0.04] -z-10 rounded-full" />
          
          {weekDays.map((day, i) => {
            const isToday = i === 4; // Mocking Friday as today
            const isHit = weekHistory[i];
            
            return (
              <div key={i} className="flex flex-col items-center gap-2 bg-transparent z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all shadow-sm ${
                  isHit 
                    ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] border-none' 
                    : isToday 
                      ? 'bg-white border-2 border-emerald-500 text-emerald-600'
                      : 'bg-[#eef1f5] border border-white/[0.6] text-zinc-400'
                }`}>
                  {day}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Time Investment Ledger */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 px-1 flex items-center gap-1.5">
          <Clock className="w-4 h-4" /> Time Engine
        </h3>
        <div className="liquid-glass rounded-2xl p-1 flex gap-1 border border-white/[0.85]">
          <div className="flex-1 bg-white/[0.4] rounded-xl p-4 border border-white/[0.6]">
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <MonitorPlay className="w-4 h-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Deep Work</span>
            </div>
            <p className="text-xl font-medium tabular-nums text-zinc-900">{timeLogged.editing}</p>
          </div>
          <div className="flex-1 bg-white/[0.4] rounded-xl p-4 border border-white/[0.6]">
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
              <Dumbbell className="w-4 h-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Training</span>
            </div>
            <p className="text-xl font-medium tabular-nums text-zinc-900">{timeLogged.gym}</p>
          </div>
        </div>
      </div>

      {/* 4. Actionable Pillars (Sleek List View instead of chunky blocks) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 px-1 flex items-center gap-1.5">
          <Activity className="w-4 h-4" /> Daily Protocol
        </h3>
        
        <div className="liquid-glass rounded-2xl overflow-hidden border border-white/[0.85] flex flex-col">
          
          {/* Gym Toggle */}
          <button 
            disabled={loading}
            className="flex items-center justify-between p-4 bg-white/[0.2] hover:bg-white/[0.4] border-b border-black/[0.04] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <Dumbbell className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-zinc-800">Complete Training</span>
            </div>
            <CheckCircle2 className="w-6 h-6 text-zinc-300" />
          </button>

          {/* Edit Toggle */}
          <button 
            disabled={loading}
            className="flex items-center justify-between p-4 bg-white/[0.2] hover:bg-white/[0.4] border-b border-black/[0.04] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <MonitorPlay className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-zinc-800">Client Deep Work</span>
            </div>
            <CheckCircle2 className="w-6 h-6 text-zinc-300" />
          </button>

          {/* Meals (Dropdown style) */}
          <div className="p-4 bg-white/[0.2]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                  <Utensils className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-zinc-800">Nutrition Protocol</span>
              </div>
              <span className="text-xs font-bold text-zinc-400 tabular-nums">0/5 Logged</span>
            </div>
            <div className="flex gap-2 w-full">
               {/* Tiny meal dots for quick tapping */}
               {[1,2,3,4,5].map((meal) => (
                 <button key={meal} className="flex-1 py-2 bg-white/[0.5] border border-white/[0.8] rounded-md text-xs font-medium text-zinc-400 hover:text-blue-600 hover:border-blue-500/30 transition-all">
                   M{meal}
                 </button>
               ))}
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}

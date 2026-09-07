// app/time/page.tsx
"use client";

import Link from "next/link";
import { useTimeTracker } from "@/hooks/useTimeTracker";
import { 
  Dumbbell, 
  MonitorPlay, 
  Utensils, 
  ArrowLeft, 
  Sparkles, 
  Play, 
  Square, 
  RotateCcw 
} from "lucide-react";

interface TimerCardProps {
  title: string;
  pillarBadge: string;
  activityKey: string;
  icon: any;
  accentColor: "emerald" | "blue" | "orange";
}

function TimerCard({
  title,
  pillarBadge,
  activityKey,
  icon: Icon,
  accentColor,
}: TimerCardProps) {
  const { isRunning, formattedTime, startTimer, stopTimer, resetTimer } = useTimeTracker(activityKey);

  const colorStyles = {
    emerald: {
      badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
      activeGlow: "border-emerald-500/50 shadow-emerald-500/10 shadow-lg bg-emerald-500/[0.03]",
      runningDot: "bg-emerald-500",
      startBtn: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    blue: {
      badge: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      activeGlow: "border-blue-500/50 shadow-blue-500/10 shadow-lg bg-blue-500/[0.03]",
      runningDot: "bg-blue-500",
      startBtn: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    orange: {
      badge: "bg-orange-500/10 text-orange-700 border-orange-500/20",
      activeGlow: "border-orange-500/50 shadow-orange-500/10 shadow-lg bg-orange-500/[0.03]",
      runningDot: "bg-orange-500",
      startBtn: "bg-orange-600 hover:bg-orange-700 text-white",
    },
  }[accentColor];

  return (
    <div
      className={`liquid-glass p-6 rounded-3xl flex flex-col items-center justify-center gap-4 border transition-all duration-300 backdrop-blur-xl bg-white/70 ${
        isRunning ? colorStyles.activeGlow : "border-white/80 shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 text-zinc-700">
          <div className="p-2 rounded-xl bg-zinc-100/80">
            <Icon className="w-4 h-4" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-800">{title}</h2>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <span className={`w-2 h-2 rounded-full animate-ping ${colorStyles.runningDot}`} />
              Live
            </span>
          )}
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${colorStyles.badge}`}>
            {pillarBadge}
          </span>
        </div>
      </div>

      <div className="text-5xl font-mono font-black tabular-nums tracking-tight text-zinc-900 py-1">
        {formattedTime}
      </div>

      <div className="flex gap-2 w-full pt-1">
        {!isRunning ? (
          <button
            onClick={startTimer}
            className={`flex-1 py-3 rounded-2xl font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${colorStyles.startBtn}`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Initiate</span>
          </button>
        ) : (
          <button
            onClick={stopTimer}
            className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>
        )}

        <button
          onClick={resetTimer}
          className="p-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-2xl font-semibold text-xs active:scale-95 transition-all cursor-pointer"
          title="Reset timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function TimePage() {
  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      <div>
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/dashboard"
            className="p-2 px-3 rounded-2xl bg-white/80 hover:bg-white text-zinc-700 border border-zinc-200 transition-all flex items-center gap-1.5 text-xs font-bold shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Console</span>
          </Link>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <Sparkles className="w-3 h-3" />
            <span>Active Telemetry</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Focus & Output</h1>
        <p className="text-zinc-500 text-sm font-medium">
          Quantified pillar timers running persistent background tracking.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <TimerCard
          title="Deep Work"
          pillarBadge="30% Weight"
          activityKey="editing_deep_work"
          icon={MonitorPlay}
          accentColor="blue"
        />

        <TimerCard
          title="Training & Conditioning"
          pillarBadge="20% Weight"
          activityKey="gym_workout"
          icon={Dumbbell}
          accentColor="emerald"
        />

        <TimerCard
          title="Nutrition & Prep"
          pillarBadge="15% Weight"
          activityKey="meal_prep"
          icon={Utensils}
          accentColor="orange"
        />
      </div>
    </div>
  );
}

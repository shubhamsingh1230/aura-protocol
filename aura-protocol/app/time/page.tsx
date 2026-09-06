"use client";

import { useTimeTracker } from "@/hooks/useTimeTracker";
import { Dumbbell, MonitorPlay, Utensils } from "lucide-react";

// The structural card for each timer
function TimerCard({ 
  title, 
  activityKey, 
  icon: Icon 
}: { 
  title: string, 
  activityKey: string,
  icon: any 
}) {
  const { isRunning, formattedTime, startTimer, stopTimer, resetTimer } = useTimeTracker(activityKey);

  return (
    <div className="liquid-glass p-6 rounded-2xl flex flex-col items-center justify-center gap-4 border border-white/[0.85]">
      <div className="flex items-center gap-2 text-zinc-500 mb-1">
        <Icon className="w-5 h-5" />
        <h3 className="text-sm font-semibold uppercase tracking-wider">{title}</h3>
      </div>
      
      <div className="text-5xl font-light tabular-nums tracking-tight text-zinc-900">
        {formattedTime}
      </div>
      
      <div className="flex gap-3 mt-2 w-full">
        {!isRunning ? (
          <button 
            onClick={startTimer}
            className="flex-1 py-3 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl font-semibold text-sm active:scale-95 transition-all"
          >
            Start
          </button>
        ) : (
          <button 
            onClick={stopTimer}
            className="flex-1 py-3 bg-red-500/10 text-red-600 border border-red-500/20 rounded-xl font-semibold text-sm active:scale-95 transition-all"
          >
            Stop
          </button>
        )}
        <button 
          onClick={resetTimer}
          className="px-4 py-3 bg-black/[0.03] text-zinc-600 rounded-xl font-medium text-sm active:scale-95 transition-all"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default function TimePage() {
  return (
    <div className="pt-12 px-6 pb-32 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Your Time</h1>
        <p className="text-zinc-500 text-sm mt-1">Track your pillars. Let it run in the background.</p>
      </div>
      
      <div className="flex flex-col gap-4">
        <TimerCard title="Gym & Training" activityKey="gym_workout" icon={Dumbbell} />
        <TimerCard title="Editing & Deep Work" activityKey="editing_deep_work" icon={MonitorPlay} />
        <TimerCard title="Meals & Prep" activityKey="meal_prep" icon={Utensils} />
      </div>
    </div>
  );
}

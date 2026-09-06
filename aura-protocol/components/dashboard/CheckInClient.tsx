"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Trophy, Dumbbell, MonitorPlay, Utensils, CheckCircle2, ChevronRight, Flame, Camera, Upload } from "lucide-react";

export default function CheckInClient({ profile, initialLog, gesture, analytics }: any) {
  const [log, setLog] = useState(initialLog);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  
  const [gymFile, setGymFile] = useState<File | null>(null);
  const [workFile, setWorkFile] = useState<File | null>(null);
  const [mealFile, setMealFile] = useState<File | null>(null);

  const supabase = createClient();

  const { consistencyScore, percentile, workTrend, gymTrend, gymTime, editingTime } = analytics || {
    consistencyScore: 0,
    percentile: 50,
    workTrend: [0,0,0,0,0,0,0],
    gymTrend: [0,0,0,0,0,0,0],
    gymTime: "0m",
    editingTime: "0m"
  };

  // 1. Gym Verification Handler
  async function handleGymVerification() {
    if (loading || !log?.id) return;
    setLoading(true);

    try {
      let photoUrl = null;

      if (gymFile) {
        const fileExt = gymFile.name.split('.').pop() || 'jpg';
        const fileName = `${profile.id}_gym_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('daily-proofs')
          .upload(fileName, gymFile);

        if (uploadError) {
          alert(`Storage Error: ${uploadError.message}`);
          setLoading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('daily-proofs')
          .getPublicUrl(fileName);
        photoUrl = publicUrlData.publicUrl;

        const { error: postError } = await supabase.from('posts').insert({
          user_id: profile.id,
          image_url: photoUrl,
          caption: "Gym session verified via Aura Protocol",
          activity: "gym"
        });

        if (postError) {
          alert(`Post Error: ${postError.message}`);
        }
      }

      const { data, error } = await supabase
        .from('daily_logs')
        .update({ gym_done: true })
        .eq('id', log.id)
        .select()
        .single();

      if (data && !error) setLog(data);
      setActiveAction(null);
      setGymFile(null);
    } catch (err: any) {
      console.error("Gym upload failed:", err);
      alert(`Unexpected error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  // 2. Deep Work Verification Handler
  async function handleWorkVerification() {
    if (loading || !log?.id) return;
    setLoading(true);

    try {
      let photoUrl = null;

      if (workFile) {
        const fileExt = workFile.name.split('.').pop() || 'jpg';
        const fileName = `${profile.id}_work_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('daily-proofs')
          .upload(fileName, workFile);

        if (uploadError) {
          alert(`Storage Error: ${uploadError.message}`);
          setLoading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('daily-proofs')
          .getPublicUrl(fileName);
        photoUrl = publicUrlData.publicUrl;

        const { error: postError } = await supabase.from('posts').insert({
          user_id: profile.id,
          image_url: photoUrl,
          caption: "Client deep work verified via Aura Protocol",
          activity: "deep_work"
        });

        if (postError) {
          alert(`Post Error: ${postError.message}`);
        }
      }

      const { data, error } = await supabase
        .from('daily_logs')
        .update({ editing_done: true })
        .eq('id', log.id)
        .select()
        .single();

      if (data && !error) setLog(data);
      setActiveAction(null);
      setWorkFile(null);
    } catch (err: any) {
      console.error("Work upload failed:", err);
      alert(`Unexpected error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  // 3. Meal Logging Handler
  async function handleMealLogging() {
    if (loading || !log?.id) return;
    setLoading(true);

    try {
      const currentMeals = log.meals_logged || 0;
      if (currentMeals >= 5) return;

      let photoUrl = null;

      if (mealFile) {
        const fileExt = mealFile.name.split('.').pop() || 'jpg';
        const fileName = `${profile.id}_meal_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('daily-proofs')
          .upload(fileName, mealFile);

        if (uploadError) {
          alert(`Storage Error: ${uploadError.message}`);
          setLoading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('daily-proofs')
          .getPublicUrl(fileName);
        photoUrl = publicUrlData.publicUrl;

        await supabase.from('posts').insert({
          user_id: profile.id,
          image_url: photoUrl,
          caption: `Meal ${currentMeals + 1}/5 logged via Aura Protocol`,
          activity: "meal"
        });
      }

      const newMealCount = currentMeals + 1;
      const { data, error } = await supabase
        .from('daily_logs')
        .update({ meals_logged: newMealCount })
        .eq('id', log.id)
        .select()
        .single();

      if (data && !error) setLog(data);
      if (newMealCount === 5) setActiveAction(null);
      setMealFile(null);
    } catch (err: any) {
      console.error("Meal log failed:", err);
      alert(`Unexpected error: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

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

      {/* 2. MIDDLE BENTO GRID (Targeted Routing: Work vs Gym History) */}
      <div className="grid grid-cols-2 gap-4">
        
        <Link href="/history?tab=work" className="liquid-glass rounded-3xl p-4 flex flex-col justify-between aspect-square active:scale-95 transition-all">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-zinc-800 font-bold text-sm tracking-tight">Deep Work</p>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-xs text-zinc-500 font-medium mb-1">Today</p>
            <p className="text-xl font-bold tabular-nums text-blue-500">{editingTime}</p>
          </div>
          <div className="flex items-end justify-between h-12 gap-1 mt-4">
            {workTrend.map((height: number, i: number) => (
              <div key={i} className="w-full bg-blue-500/20 rounded-t-sm relative flex items-end justify-center" style={{ height: '100%' }}>
                <div className="w-full bg-blue-500 rounded-t-sm transition-all" style={{ height: `${height}%` }} />
              </div>
            ))}
          </div>
        </Link>

        <Link href="/history?tab=gym" className="liquid-glass rounded-3xl p-4 flex flex-col justify-between aspect-square active:scale-95 transition-all">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-zinc-800 font-bold text-sm tracking-tight">Training</p>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-xs text-zinc-500 font-medium mb-1">Today</p>
            <p className="text-xl font-bold tabular-nums text-emerald-500">{gymTime}</p>
          </div>
          <div className="flex items-end justify-between h-12 gap-1 mt-4">
            {gymTrend.map((height: number, i: number) => (
              <div key={i} className="w-full bg-emerald-500/20 rounded-t-sm relative flex items-end justify-center" style={{ height: '100%' }}>
                <div className="w-full bg-emerald-500 rounded-t-sm transition-all" style={{ height: `${height}%` }} />
              </div>
            ))}
          </div>
        </Link>

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

      {/* 3. LIVE LOGGING ACTIONS (Accordions with Forced Live Camera Capture) */}
      <div className="mt-6">
        <h2 className="text-lg font-bold text-zinc-900 mb-3 px-2">Action Items</h2>
        <div className="liquid-glass rounded-3xl p-2 flex flex-col gap-1.5">
          
          {/* Gym Verification Accordion */}
          <div className={`rounded-2xl transition-all overflow-hidden ${activeAction === 'gym' ? 'bg-white/[0.8] shadow-sm' : 'bg-white/[0.4] hover:bg-white/[0.6]'}`}>
            <button 
              onClick={() => setActiveAction(activeAction === 'gym' ? null : 'gym')}
              className="flex items-center justify-between p-3 w-full"
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
            
            {activeAction === 'gym' && !log?.gym_done && (
              <div className="px-3 pb-3 pt-1 space-y-3">
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 border-dashed text-center flex flex-col items-center gap-2">
                  <Camera className="w-6 h-6 text-zinc-400" />
                  <p className="text-xs text-zinc-500 font-medium">
                    Show today's gesture: <strong className="text-zinc-900">{typeof gesture === 'string' ? gesture : (gesture?.name || gesture?.gesture_name || "Peace Sign")}</strong>
                  </p>
                  
                  {/* FORCED LIVE CAMERA CAPTURE */}
                  <label className="mt-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-700 cursor-pointer shadow-sm hover:bg-zinc-50 flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    {gymFile ? "Live Photo Captured ✓" : "Open Camera"}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      className="hidden" 
                      onChange={(e) => setGymFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <button 
                  onClick={handleGymVerification}
                  disabled={loading || !gymFile}
                  className={`w-full py-2.5 text-white font-bold text-sm rounded-xl transition-all active:scale-95 ${
                    gymFile ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-zinc-300 cursor-not-allowed'
                  }`}
                >
                  {loading ? "Uploading to Feed..." : "Upload & Verify Gym"}
                </button>
              </div>
            )}
          </div>

          {/* Deep Work Accordion */}
          <div className={`rounded-2xl transition-all overflow-hidden ${activeAction === 'work' ? 'bg-white/[0.8] shadow-sm' : 'bg-white/[0.4] hover:bg-white/[0.6]'}`}>
            <button 
              onClick={() => setActiveAction(activeAction === 'work' ? null : 'work')}
              className="flex items-center justify-between p-3 w-full"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-full">
                  <MonitorPlay className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-zinc-800">Client Deep Work</p>
                  <p className="text-xs text-zinc-500 font-medium">{log?.editing_done ? "Complete" : "Pending Proof"}</p>
                </div>
              </div>
              <CheckCircle2 className={`w-5 h-5 transition-colors ${log?.editing_done ? 'text-blue-500' : 'text-zinc-300'}`} />
            </button>

            {activeAction === 'work' && !log?.editing_done && (
              <div className="px-3 pb-3 pt-1 space-y-3">
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 border-dashed text-center flex flex-col items-center gap-2">
                  <Camera className="w-6 h-6 text-zinc-400" />
                  <p className="text-xs text-zinc-500 font-medium">Capture workspace live proof</p>
                  
                  <label className="mt-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-700 cursor-pointer shadow-sm hover:bg-zinc-50 flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    {workFile ? "Workspace Photo Captured ✓" : "Open Camera"}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      className="hidden" 
                      onChange={(e) => setWorkFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <div className="flex gap-2">
                  <Link href="/time" className="flex-1 py-2.5 bg-blue-50 text-blue-600 border border-blue-200 text-center font-bold text-sm rounded-xl transition-all active:scale-95 flex items-center justify-center">
                    Timer
                  </Link>
                  <button 
                    onClick={handleWorkVerification}
                    disabled={loading || !workFile}
                    className={`flex-1 py-2.5 text-white font-bold text-sm rounded-xl transition-all active:scale-95 ${
                      workFile ? 'bg-blue-500 hover:bg-blue-600' : 'bg-zinc-300 cursor-not-allowed'
                    }`}
                  >
                    {loading ? "Saving..." : "Upload & Complete"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Meals Accordion */}
          <div className={`rounded-2xl transition-all overflow-hidden ${activeAction === 'meals' ? 'bg-white/[0.8] shadow-sm' : 'bg-white/[0.4] hover:bg-white/[0.6]'}`}>
            <button 
              onClick={() => setActiveAction(activeAction === 'meals' ? null : 'meals')}
              className="flex items-center justify-between p-3 w-full"
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

            {activeAction === 'meals' && (log?.meals_logged || 0) < 5 && (
              <div className="px-3 pb-3 pt-1 space-y-3">
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 border-dashed text-center flex flex-col items-center gap-2">
                  <Camera className="w-6 h-6 text-zinc-400" />
                  <p className="text-xs text-zinc-500 font-medium">Capture meal photo (Optional)</p>
                  
                  <label className="mt-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-700 cursor-pointer shadow-sm hover:bg-zinc-50 flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    {mealFile ? "Meal Photo Captured ✓" : "Open Camera"}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      className="hidden" 
                      onChange={(e) => setMealFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <button 
                  onClick={handleMealLogging}
                  disabled={loading}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-all active:scale-95"
                >
                  {loading ? "Logging..." : `Log Meal (${(log?.meals_logged || 0) + 1}/5) & Post`}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}

    </div>
  );
}

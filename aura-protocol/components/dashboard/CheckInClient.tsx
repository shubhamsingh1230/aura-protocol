// components/dashboard/CheckInClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Trophy, 
  Dumbbell, 
  MonitorPlay, 
  Utensils, 
  CheckCircle2, 
  ChevronRight, 
  Flame, 
  Camera, 
  Upload, 
  Sparkles, 
  Sun, 
  BookOpen, 
  Moon, 
  ClipboardCheck, 
  Circle, 
  Loader2,
  Shield,
  Clock,
  TrendingUp
} from "lucide-react";

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas is empty"));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          0.7
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

export default function CheckInClient({ profile, initialLog, gesture, analytics }: any) {
  const [log, setLog] = useState(initialLog);
  const [userProfile, setUserProfile] = useState(profile);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const router = useRouter();

  const [gymFile, setGymFile] = useState<File | null>(null);
  const [workFile, setWorkFile] = useState<File | null>(null);
  const [mealFile, setMealFile] = useState<File | null>(null);

  const supabase = createClient();

  const { 
    consistencyScore = 0, 
    percentile = 50, 
    workTrend = [0, 0, 0, 0, 0, 0, 0], 
    gymTrend = [0, 0, 0, 0, 0, 0, 0], 
    gymTime = "0m", 
    editingTime = "0m",
    auraPoints = 0,
    identityRank = "Initiate",
    currentStreak = 0,
    streakShields = 0
  } = analytics || {};

  const currentShields = userProfile?.streak_shields ?? streakShields ?? 0;
  const currentStreakCount = userProfile?.current_streak ?? currentStreak ?? 0;
  const currentAP = userProfile?.aura_points ?? auraPoints ?? 0;
  const rank = userProfile?.identity_rank || identityRank || "Initiate";
  const movementLabel = userProfile?.movement_label || "Physical Training";
  const grindLabel = userProfile?.grind_label || "Deep Work Block";

  async function uploadToStorage(fileName: string, file: File): Promise<string> {
    const bucket = "daily-proofs";
    let { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);

    // Fallback to 'proofs' bucket if 'daily-proofs' is not configured
    if (uploadError && uploadError.message?.toLowerCase().includes("bucket not found")) {
      const { error: fallbackError } = await supabase.storage.from("proofs").upload(fileName, file);
      if (fallbackError) throw fallbackError;
      const { data } = supabase.storage.from("proofs").getPublicUrl(fileName);
      return data.publicUrl;
    } else if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function awardProfilePoints(apDelta: number, xpDelta: number) {
    const updatedAP = Math.max(0, (userProfile?.aura_points || currentAP || 0) + apDelta);
    const updatedXP = Math.max(0, (userProfile?.xp || 0) + xpDelta);

    const { error } = await supabase
      .from("profiles")
      .update({
        aura_points: updatedAP,
        xp: updatedXP,
      })
      .eq("id", userProfile.id);

    if (!error) {
      setUserProfile((prev: any) => ({
        ...prev,
        aura_points: updatedAP,
        xp: updatedXP,
      }));
    }
  }

  async function handleGymVerification() {
    if (loading || !log?.id) return;
    if (!gymFile) {
      alert("Photo proof is required for workout verification!");
      return;
    }
    setLoading(true);

    try {
      const optimizedFile = await compressImage(gymFile);
      const fileName = `${userProfile.id}_gym_${Date.now()}.jpg`;
      const publicUrl = await uploadToStorage(fileName, optimizedFile);

      await supabase.from("posts").insert({
        user_id: userProfile.id,
        daily_log_id: log.id,
        image_url: publicUrl,
        caption: `${movementLabel} verified via Aura Protocol`,
        activity: "gym",
      });

      const { data: updatedLog, error } = await supabase
        .from("daily_logs")
        .update({ 
          gym_done: true,
          workout: true 
        })
        .eq("id", log.id)
        .select()
        .single();

      if (error) {
        alert(`Update Error: ${error.message}`);
        setLoading(false);
        return;
      }

      setLog(updatedLog);
      await awardProfilePoints(10, 25);
      setGymFile(null);
      setActiveAction(null);
      router.refresh();
    } catch (err: any) {
      console.error("Gym upload failed:", err);
      alert(`Upload failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleWorkVerification() {
    if (loading || !log?.id) return;
    if (!workFile) {
      alert("Photo proof is required for deep work verification!");
      return;
    }
    setLoading(true);

    try {
      const optimizedFile = await compressImage(workFile);
      const fileName = `${userProfile.id}_work_${Date.now()}.jpg`;
      const publicUrl = await uploadToStorage(fileName, optimizedFile);

      await supabase.from("posts").insert({
        user_id: userProfile.id,
        daily_log_id: log.id,
        image_url: publicUrl,
        caption: `${grindLabel} verified via Aura Protocol`,
        activity: "deep_work",
      });

      const { data: updatedLog, error } = await supabase
        .from("daily_logs")
        .update({ 
          editing_done: true,
          deep_work: true 
        })
        .eq("id", log.id)
        .select()
        .single();

      if (error) {
        alert(`Update Error: ${error.message}`);
        setLoading(false);
        return;
      }

      setLog(updatedLog);
      await awardProfilePoints(10, 30);
      setWorkFile(null);
      setActiveAction(null);
      router.refresh();
    } catch (err: any) {
      console.error("Work upload failed:", err);
      alert(`Upload failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleMealLogging() {
    if (loading || !log?.id) return;
    const currentMeals = log.meals_logged || 0;
    if (currentMeals >= 5) return;

    if (!mealFile) {
      alert("Photo proof is required to log a meal!");
      return;
    }

    setLoading(true);

    try {
      const optimizedFile = await compressImage(mealFile);
      const fileName = `${userProfile.id}_meal_${Date.now()}.jpg`;
      const publicUrl = await uploadToStorage(fileName, optimizedFile);

      await supabase.from("posts").insert({
        user_id: userProfile.id,
        daily_log_id: log.id,
        image_url: publicUrl,
        caption: `Meal ${currentMeals + 1}/5 logged via Aura Protocol`,
        activity: "meal",
      });

      const newMealCount = currentMeals + 1;
      const isNutritionComplete = newMealCount === 5;

      const { data: updatedLog, error } = await supabase
        .from("daily_logs")
        .update({ 
          meals_logged: newMealCount,
          nutrition: isNutritionComplete ? true : (log?.nutrition || false)
        })
        .eq("id", log.id)
        .select()
        .single();

      if (error) {
        alert(`Update Error: ${error.message}`);
        setLoading(false);
        return;
      }

      setLog(updatedLog);
      await awardProfilePoints(1, 3);
      setMealFile(null);
      setActiveAction(null);
      router.refresh();
    } catch (err: any) {
      console.error("Meal log failed:", err);
      alert(`Upload failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleTogglePillar(pillarKey: string, apVal: number, xpVal: number) {
    if (togglingKey || !log?.id) return;
    setTogglingKey(pillarKey);

    const willBeDone = !log[pillarKey];
    const apDelta = willBeDone ? apVal : -apVal;
    const xpDelta = willBeDone ? xpVal : -xpVal;

    const { data: updated, error } = await supabase
      .from("daily_logs")
      .update({ [pillarKey]: willBeDone })
      .eq("id", log.id)
      .select()
      .single();

    if (error) {
      alert(`Update failed: ${error.message}`);
    } else {
      setLog(updated);
      await awardProfilePoints(apDelta, xpDelta);
    }

    setTogglingKey(null);
  }

  const isGymDone = !!(log?.gym_done || log?.workout);
  const isWorkDone = !!(log?.editing_done || log?.deep_work);
  const mealsLoggedCount = Math.min(5, log?.meals_logged || 0);
  const isNutritionDone = !!(log?.nutrition || mealsLoggedCount === 5);
  const isMorningDone = !!log?.morning_routine;
  const isLearningDone = !!log?.learning;
  const isSleepDone = !!log?.sleep_target;
  const isReviewDone = !!log?.daily_review;

  const calculatedDailyScore = Math.round(
    (isWorkDone ? 30 : 0) +
    (isGymDone ? 20 : 0) +
    ((mealsLoggedCount / 5) * 15) +
    (isMorningDone ? 10 : 0) +
    (isLearningDone ? 10 : 0) +
    (isSleepDone ? 10 : 0) +
    (isReviewDone ? 5 : 0)
  );

  const pillarsCompleteCount = 
    (isGymDone ? 1 : 0) + 
    (isWorkDone ? 1 : 0) + 
    (isNutritionDone ? 1 : 0) + 
    (isMorningDone ? 1 : 0) + 
    (isLearningDone ? 1 : 0) + 
    (isSleepDone ? 1 : 0) + 
    (isReviewDone ? 1 : 0);

  const radius = 15.9155;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (calculatedDailyScore / 100) * circumference;

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-4 max-w-md mx-auto">
      {/* HEADER: OPERATOR IDENTITY BAR */}
      <div className="flex items-center justify-between px-1 mb-1">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Command Center</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs font-mono font-bold text-zinc-500">
              @{userProfile?.handle || profile?.handle || "operator"}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
              {rank}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="liquid-glass px-2.5 py-1.5 rounded-2xl flex items-center gap-1 border border-white/80 shadow-xs text-xs font-bold text-orange-600 bg-white/70">
            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
            <span>{currentStreakCount}d</span>
          </div>

          <div className="liquid-glass px-2.5 py-1.5 rounded-2xl flex items-center gap-1 border border-white/80 shadow-xs text-xs font-bold text-blue-600 bg-white/70">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            <span>{currentShields}</span>
          </div>

          <div className="liquid-glass px-3 py-1.5 rounded-2xl flex items-center gap-1.5 border border-white/80 shadow-xs text-xs font-black text-emerald-600 bg-white/70">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{currentAP} AP</span>
          </div>
        </div>
      </div>

      {/* TOP CARD: DAILY GAUNTLET */}
      <div className="liquid-glass rounded-3xl p-5 flex items-center justify-between border border-white/80 shadow-sm backdrop-blur-xl bg-white/75">
        <div className="flex-1">
          <p className="text-zinc-800 font-bold text-base mb-0.5 tracking-tight">Daily Gauntlet</p>
          <div className="text-zinc-500 text-xs font-medium mb-3">
            Aura Protocol Score
            <span className="block text-emerald-600 font-black text-2xl mt-0.5">
              {calculatedDailyScore}<span className="text-xs text-zinc-400 font-bold">/100</span>
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            {pillarsCompleteCount} of 7 Disciplines Verified
          </p>
        </div>
        
        <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="3.5" />
            <circle 
              cx="18" 
              cy="18" 
              r={radius} 
              fill="none" 
              className="text-emerald-500 drop-shadow-sm transition-all duration-1000 ease-out" 
              stroke="currentColor" 
              strokeWidth="3.5" 
              strokeDasharray={circumference} 
              strokeDashoffset={strokeDashoffset} 
              strokeLinecap="round" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <Flame className="w-5 h-5 text-emerald-500 mb-0.5" />
            <span className="text-[11px] font-black text-zinc-800 tabular-nums">{calculatedDailyScore}%</span>
          </div>
        </div>
      </div>

      {/* BENTO GRID ANALYTICS */}
      <div className="grid grid-cols-2 gap-3">
        {/* Deep Work Tile */}
        <Link 
          href="/history?tab=work" 
          className="liquid-glass rounded-3xl p-4 flex flex-col justify-between aspect-square active:scale-98 transition-all border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 group"
        >
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-zinc-800 font-bold text-xs tracking-tight truncate">{grindLabel}</p>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">Logged Today</p>
            <p className="text-xl font-black tabular-nums text-blue-600 mt-1">{editingTime}</p>
          </div>
          <div className="flex items-end justify-between h-10 gap-1 mt-2">
            {workTrend.map((height: number, i: number) => (
              <div key={i} className="w-full bg-blue-500/10 rounded-t-sm relative flex items-end justify-center h-full">
                <div className="w-full bg-blue-500 rounded-t-sm transition-all" style={{ height: `${Math.max(8, height)}%` }} />
              </div>
            ))}
          </div>
        </Link>

        {/* Training Tile */}
        <Link 
          href="/history?tab=gym" 
          className="liquid-glass rounded-3xl p-4 flex flex-col justify-between aspect-square active:scale-98 transition-all border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 group"
        >
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-zinc-800 font-bold text-xs tracking-tight truncate">{movementLabel}</p>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">Logged Today</p>
            <p className="text-xl font-black tabular-nums text-emerald-600 mt-1">{gymTime}</p>
          </div>
          <div className="flex items-end justify-between h-10 gap-1 mt-2">
            {gymTrend.map((height: number, i: number) => (
              <div key={i} className="w-full bg-emerald-500/10 rounded-t-sm relative flex items-end justify-center h-full">
                <div className="w-full bg-emerald-500 rounded-t-sm transition-all" style={{ height: `${Math.max(8, height)}%` }} />
              </div>
            ))}
          </div>
        </Link>

        {/* Arena Percentile Tile */}
        <Link 
          href="/arena" 
          className="liquid-glass rounded-3xl p-4 aspect-square flex flex-col justify-center items-center text-center relative overflow-hidden border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 active:scale-98 transition-all"
        >
          <Trophy className="w-6 h-6 text-amber-500 mb-1" />
          <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Percentile</p>
          <p className="text-2xl font-black tabular-nums text-zinc-900 mt-0.5">Top {percentile}%</p>
          <p className="text-[9px] text-emerald-600 font-bold mt-1">View Arena →</p>
        </Link>

        {/* 30-Day Consistency Tile */}
        <Link 
          href="/autopsy" 
          className="liquid-glass rounded-3xl p-4 aspect-square flex flex-col justify-center items-center text-center relative overflow-hidden border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 active:scale-98 transition-all"
        >
          <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">Consistency</p>
          <p className="text-3xl font-black tabular-nums text-zinc-900">{consistencyScore}%</p>
          <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Past 30 Days</p>
        </Link>
      </div>

      {/* PROOF ACTIONS SECTION */}
      <div className="mt-4">
        <h2 className="text-xs font-bold text-zinc-400 mb-2 px-1 uppercase tracking-wider">
          Visual Proof Pillars
        </h2>
        <div className="liquid-glass rounded-3xl p-2 flex flex-col gap-2 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70">
          
          {/* Gym Verification */}
          <div className={`rounded-2xl transition-all overflow-hidden border ${isGymDone ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/60 border-zinc-100"}`}>
            <button 
              onClick={() => setActiveAction(activeAction === "gym" ? null : "gym")} 
              className="flex items-center justify-between p-3.5 w-full text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-800">{movementLabel}</p>
                  <p className="text-[10px] text-zinc-400 font-medium">+10 AP • +25 XP • 20% Weight</p>
                </div>
              </div>
              <CheckCircle2 className={`w-5 h-5 transition-colors ${isGymDone ? "text-emerald-500" : "text-zinc-300"}`} />
            </button>
            
            {activeAction === "gym" && !isGymDone && (
              <div className="px-3 pb-3 pt-1 space-y-3">
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 border-dashed text-center flex flex-col items-center gap-1.5">
                  <Camera className="w-5 h-5 text-zinc-400" />
                  <p className="text-xs text-zinc-600 font-medium">
                    Show today&apos;s gesture: <strong className="text-zinc-900">{typeof gesture === "string" ? gesture : (gesture?.name || gesture?.gesture_name || "✌️ Peace Sign")}</strong>
                  </p>
                  <label className="mt-1 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 cursor-pointer shadow-sm hover:bg-zinc-50 flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{gymFile ? "Photo Selected ✓" : "Capture Live Photo"}</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setGymFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div className="flex gap-2">
                  <Link href="/time" className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-center font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Stopwatch</span>
                  </Link>
                  <button 
                    onClick={handleGymVerification} 
                    disabled={loading || !gymFile} 
                    className={`flex-1 py-2.5 text-white font-bold text-xs rounded-xl transition-all shadow-sm ${
                      gymFile ? "bg-zinc-900 hover:bg-zinc-800" : "bg-zinc-300 cursor-not-allowed"
                    }`}
                  >
                    {loading ? "Verifying..." : "Upload Proof"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Deep Work Verification */}
          <div className={`rounded-2xl transition-all overflow-hidden border ${isWorkDone ? "bg-blue-500/5 border-blue-500/20" : "bg-white/60 border-zinc-100"}`}>
            <button 
              onClick={() => setActiveAction(activeAction === "work" ? null : "work")} 
              className="flex items-center justify-between p-3.5 w-full text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
                  <MonitorPlay className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-800">{grindLabel}</p>
                  <p className="text-[10px] text-zinc-400 font-medium">+10 AP • +30 XP • 30% Weight</p>
                </div>
              </div>
              <CheckCircle2 className={`w-5 h-5 transition-colors ${isWorkDone ? "text-blue-500" : "text-zinc-300"}`} />
            </button>
            
            {activeAction === "work" && !isWorkDone && (
              <div className="px-3 pb-3 pt-1 space-y-3">
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 border-dashed text-center flex flex-col items-center gap-1.5">
                  <Camera className="w-5 h-5 text-zinc-400" />
                  <p className="text-xs text-zinc-600 font-medium">Capture workspace visual proof</p>
                  <label className="mt-1 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 cursor-pointer shadow-sm hover:bg-zinc-50 flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{workFile ? "Photo Selected ✓" : "Capture Live Photo"}</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setWorkFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div className="flex gap-2">
                  <Link href="/time" className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-center font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Stopwatch</span>
                  </Link>
                  <button 
                    onClick={handleWorkVerification} 
                    disabled={loading || !workFile} 
                    className={`flex-1 py-2.5 text-white font-bold text-xs rounded-xl transition-all shadow-sm ${
                      workFile ? "bg-zinc-900 hover:bg-zinc-800" : "bg-zinc-300 cursor-not-allowed"
                    }`}
                  >
                    {loading ? "Saving..." : "Upload Proof"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Meals Logging */}
          <div className={`rounded-2xl transition-all overflow-hidden border ${isNutritionDone ? "bg-orange-500/5 border-orange-500/20" : "bg-white/60 border-zinc-100"}`}>
            <button 
              onClick={() => setActiveAction(activeAction === "meals" ? null : "meals")} 
              className="flex items-center justify-between p-3.5 w-full text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-500/10 text-orange-600 rounded-xl">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-800">Target Nutrition Protocol</p>
                  <p className="text-[10px] text-zinc-400 font-medium">{mealsLoggedCount}/5 Meals • 15% Weight</p>
                </div>
              </div>
              <CheckCircle2 className={`w-5 h-5 transition-colors ${isNutritionDone ? "text-orange-500" : "text-zinc-300"}`} />
            </button>
            
            {activeAction === "meals" && mealsLoggedCount < 5 && (
              <div className="px-3 pb-3 pt-1 space-y-3">
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 border-dashed text-center flex flex-col items-center gap-1.5">
                  <Camera className="w-5 h-5 text-zinc-400" />
                  <p className="text-xs text-zinc-600 font-medium">Capture meal photo ({mealsLoggedCount + 1}/5)</p>
                  <label className="mt-1 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 cursor-pointer shadow-sm hover:bg-zinc-50 flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{mealFile ? "Photo Selected ✓" : "Capture Live Photo"}</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setMealFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <button 
                  onClick={handleMealLogging} 
                  disabled={loading || !mealFile} 
                  className={`w-full py-2.5 text-white font-bold text-xs rounded-xl transition-all shadow-sm ${
                    mealFile ? "bg-orange-500 hover:bg-orange-600" : "bg-zinc-300 cursor-not-allowed"
                  }`}
                >
                  {loading ? "Logging..." : `Log Meal (${mealsLoggedCount + 1}/5)`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PROTOCOL ROUTINE DISCIPLINES */}
      <div className="mt-4">
        <h2 className="text-xs font-bold text-zinc-400 mb-2 px-1 uppercase tracking-wider">
          Routine Disciplines
        </h2>
        <div className="liquid-glass rounded-3xl p-2 flex flex-col gap-1.5 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70">
          
          {/* Morning Routine */}
          <div 
            onClick={() => handleTogglePillar("morning_routine", 5, 15)}
            className={`p-3.5 rounded-2xl cursor-pointer flex items-center justify-between transition-all border ${
              isMorningDone ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/60 border-zinc-100 hover:bg-white/80"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-800">Morning Protocol</p>
                <p className="text-[10px] text-zinc-400 font-medium">+5 AP • +15 XP • 10% Weight</p>
              </div>
            </div>
            {togglingKey === "morning_routine" ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            ) : isMorningDone ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Circle className="w-5 h-5 text-zinc-300" />
            )}
          </div>

          {/* Active Learning */}
          <div 
            onClick={() => handleTogglePillar("learning", 5, 15)}
            className={`p-3.5 rounded-2xl cursor-pointer flex items-center justify-between transition-all border ${
              isLearningDone ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/60 border-zinc-100 hover:bg-white/80"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-800">Active Learning Block</p>
                <p className="text-[10px] text-zinc-400 font-medium">+5 AP • +15 XP • 10% Weight</p>
              </div>
            </div>
            {togglingKey === "learning" ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            ) : isLearningDone ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Circle className="w-5 h-5 text-zinc-300" />
            )}
          </div>

          {/* Sleep Target */}
          <div 
            onClick={() => handleTogglePillar("sleep_target", 5, 15)}
            className={`p-3.5 rounded-2xl cursor-pointer flex items-center justify-between transition-all border ${
              isSleepDone ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/60 border-zinc-100 hover:bg-white/80"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-800">Sleep Target (7h+ Rest)</p>
                <p className="text-[10px] text-zinc-400 font-medium">+5 AP • +15 XP • 10% Weight</p>
              </div>
            </div>
            {togglingKey === "sleep_target" ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            ) : isSleepDone ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Circle className="w-5 h-5 text-zinc-300" />
            )}
          </div>

          {/* Evening Review */}
          <div 
            onClick={() => handleTogglePillar("daily_review", 5, 10)}
            className={`p-3.5 rounded-2xl cursor-pointer flex items-center justify-between transition-all border ${
              isReviewDone ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/60 border-zinc-100 hover:bg-white/80"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/10 text-teal-600 rounded-xl">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-800">Evening Review & Planning</p>
                <p className="text-[10px] text-zinc-400 font-medium">+5 AP • +10 XP • 5% Weight</p>
              </div>
            </div>
            {togglingKey === "daily_review" ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            ) : isReviewDone ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Circle className="w-5 h-5 text-zinc-300" />
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

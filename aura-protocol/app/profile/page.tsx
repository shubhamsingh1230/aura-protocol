// app/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Shield, 
  Flame, 
  Sparkles, 
  Award, 
  Calendar, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Plus
} from "lucide-react";

interface ProfileData {
  id: string;
  full_name: string | null;
  handle: string | null;
  aura_points: number;
  xp: number;
  identity_rank: string;
  current_streak: number;
  streak_shields: number;
  subscription_status: string;
}

const RANK_TIERS = [
  { name: "Initiate", minAP: 0, maxAP: 199 },
  { name: "Disciplined", minAP: 200, maxAP: 499 },
  { name: "Operator", minAP: 500, maxAP: 999 },
  { name: "Elite", minAP: 1000, maxAP: 1999 },
  { name: "Apex", minAP: 2000, maxAP: Infinity },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activityMap, setActivityMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [shieldLoading, setShieldLoading] = useState(false);
  const [banner, setBanner] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadProfileAndActivity();
  }, []);

  async function loadProfileAndActivity() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch profile metrics
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(profileData);

    // 2. Fetch activity posts from the past 90 days for the Contribution Matrix
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: postsData } = await supabase
      .from("posts")
      .select("created_at")
      .eq("user_id", user.id)
      .gte("created_at", ninetyDaysAgo.toISOString());

    // Aggregate post counts per calendar date (YYYY-MM-DD)
    const counts: Record<string, number> = {};
    (postsData || []).forEach((post) => {
      const dateKey = new Date(post.created_at).toISOString().split("T")[0];
      counts[dateKey] = (counts[dateKey] || 0) + 1;
    });

    setActivityMap(counts);
    setLoading(false);
  }

  async function handleBuyShield() {
    if (!profile) return;
    setBanner(null);

    const SHIELD_COST = 150; // 150 AP per Streak Freeze

    if ((profile.aura_points || 0) < SHIELD_COST) {
      setBanner({
        text: `Insufficient AP. You need ${SHIELD_COST - profile.aura_points} more Aura Points to purchase a Streak Shield.`,
        type: "error",
      });
      return;
    }

    setShieldLoading(true);

    const newPoints = profile.aura_points - SHIELD_COST;
    const newShields = (profile.streak_shields || 0) + 1;

    const { error } = await supabase
      .from("profiles")
      .update({
        aura_points: newPoints,
        streak_shields: newShields,
      })
      .eq("id", profile.id);

    if (error) {
      setBanner({ text: `Failed to acquire shield: ${error.message}`, type: "error" });
    } else {
      setProfile((prev) => prev ? { ...prev, aura_points: newPoints, streak_shields: newShields } : null);
      setBanner({ text: "Streak Shield activated! Your streak is secured against unexpected skips.", type: "success" });
    }

    setShieldLoading(false);
  }

  if (loading) {
    return (
      <div className="pt-24 text-center flex flex-col items-center justify-center space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        <p className="text-xs text-zinc-400 font-medium">Rendering Operator Dossier...</p>
      </div>
    );
  }

  // Calculate Rank Progression Percentage
  const currentAP = profile?.aura_points || 0;
  const currentTier = RANK_TIERS.find((t) => currentAP >= t.minAP && currentAP <= t.maxAP) || RANK_TIERS[0];
  const nextTier = RANK_TIERS[RANK_TIERS.indexOf(currentTier) + 1];
  
  const progressPercent = nextTier 
    ? Math.min(100, Math.round(((currentAP - currentTier.minAP) / (nextTier.minAP - currentTier.minAP)) * 100))
    : 100;

  // Generate 84 days (12 weeks) for the Heatmap Matrix
  const matrixDays = Array.from({ length: 84 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (83 - i));
    const key = d.toISOString().split("T")[0];
    return {
      date: key,
      count: activityMap[key] || 0,
    };
  });

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Profile Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Operator File</h1>
          <p className="text-zinc-500 text-sm font-medium">@{profile?.handle || "unassigned"}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          profile?.subscription_status === 'active' 
            ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' 
            : 'bg-zinc-200 text-zinc-600'
        }`}>
          {profile?.subscription_status === 'active' ? 'Active Pass' : 'Trialing'}
        </span>
      </div>

      {/* Banner Feedback */}
      {banner && (
        <div className={`p-4 rounded-2xl text-xs font-bold border flex items-start gap-2.5 ${
          banner.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-red-50 border-red-200 text-red-600"
        }`}>
          {banner.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Identity & Rank Dossier Card */}
      <div className="liquid-glass rounded-3xl p-5 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shadow-md">
              <Award className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Current Rank</p>
              <h2 className="text-xl font-extrabold text-zinc-900">{currentTier.name}</h2>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-zinc-900">{currentAP}</span>
            <span className="text-xs font-bold text-emerald-600 ml-1">AP</span>
          </div>
        </div>

        {/* Level Progression Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-[11px] font-bold text-zinc-400">
            <span>Progress to {nextTier ? nextTier.name : "Apex Peak"}</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden p-0.5 border border-zinc-200/60">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-sm" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Vital Metrics: Streak & Shields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="liquid-glass rounded-3xl p-4 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Discipline</span>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-900">{profile?.current_streak || 0}</div>
            <p className="text-[10px] text-zinc-400 font-medium">Consecutive Active Days</p>
          </div>
        </div>

        <div className="liquid-glass rounded-3xl p-4 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Streak Shields</span>
            <Shield className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-black text-zinc-900">{profile?.streak_shields || 0}</div>
              <p className="text-[10px] text-zinc-400 font-medium">Active Shields</p>
            </div>
            <button
              onClick={handleBuyShield}
              disabled={shieldLoading}
              className="p-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              title="Acquire Shield (150 AP)"
            >
              {shieldLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* GitHub-Style Contribution Heatmap Matrix */}
      <div className="liquid-glass rounded-3xl p-5 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Proof of Work Matrix</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">Last 12 Weeks</span>
        </div>

        {/* 12-column x 7-row Matrix Grid */}
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 pt-1 overflow-x-auto py-2">
          {matrixDays.map((day) => {
            let colorClass = "bg-zinc-100 border-zinc-200/50";
            if (day.count === 1) colorClass = "bg-emerald-200 border-emerald-300";
            else if (day.count === 2) colorClass = "bg-emerald-400 border-emerald-500";
            else if (day.count >= 3) colorClass = "bg-emerald-600 border-emerald-700 shadow-sm";

            return (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} proofs submitted`}
                className={`w-3.5 h-3.5 rounded-md border ${colorClass} transition-colors`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-1.5 text-[10px] text-zinc-400 font-medium pt-1">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded bg-zinc-100 border border-zinc-200/50" />
          <div className="w-2.5 h-2.5 rounded bg-emerald-200" />
          <div className="w-2.5 h-2.5 rounded bg-emerald-400" />
          <div className="w-2.5 h-2.5 rounded bg-emerald-600" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

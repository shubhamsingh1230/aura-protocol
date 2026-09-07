// app/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Shield, 
  Flame, 
  Sparkles, 
  Award, 
  CreditCard, 
  LogOut, 
  Copy, 
  Check, 
  Loader2, 
  Calendar,
  ExternalLink,
  Zap,
  CheckCircle2,
  RefreshCw
} from "lucide-react";

interface ProfileData {
  id: string;
  handle: string | null;
  full_name: string | null;
  email: string | null;
  aura_points: number;
  xp: number;
  current_streak: number;
  longest_streak: number;
  streak_shields: number;
  identity_rank: string;
  subscription_status: string;
  trial_ends_at: string | null;
  movement_label: string | null;
  grind_label: string | null;
}

const RANK_THRESHOLDS = [
  { rank: "Initiate", min: 0, next: 200 },
  { rank: "Disciplined", min: 200, next: 500 },
  { rank: "Operator", min: 500, next: 1000 },
  { rank: "Elite", min: 1000, next: 2000 },
  { rank: "Apex", min: 2000, next: 2000 },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadDossier();
  }, []);

  async function loadDossier() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(data);
    setLoading(false);
  }

  function handleCopyInvite() {
    const handle = profile?.handle || "operator";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/invite/${handle}`;

    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // Calculate Rank Progression Percentage
  const currentAP = profile?.aura_points || 0;
  const currentTier = RANK_THRESHOLDS.find((t) => t.rank === (profile?.identity_rank || "Initiate")) || RANK_THRESHOLDS[0];
  const isMaxTier = currentTier.rank === "Apex";
  const pointsIntoTier = Math.max(0, currentAP - currentTier.min);
  const tierSpan = currentTier.next - currentTier.min;
  const rankProgress = isMaxTier ? 100 : Math.min(100, Math.round((pointsIntoTier / tierSpan) * 100));

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Operator Dossier</h1>
        <p className="text-zinc-500 text-sm font-medium">Quantified Status & Protocol Credentials</p>
      </div>

      {loading ? (
        <div className="pt-24 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <p className="text-xs text-zinc-400 font-medium">Decrypting Dossier Credentials...</p>
        </div>
      ) : (
        <>
          {/* Identity Header Card */}
          <div className="liquid-glass rounded-3xl p-6 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-black text-lg shadow-md">
                  {(profile?.handle || "O").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900 leading-tight">
                    {profile?.full_name || profile?.handle}
                  </h2>
                  <p className="text-xs font-mono text-zinc-400 font-bold">
                    @{profile?.handle || "operator"}
                  </p>
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                    <Shield className="w-3 h-3 text-emerald-600" />
                    {profile?.identity_rank || "Initiate"}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCopyInvite}
                className="p-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Copy Invite Link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
              </button>
            </div>

            {/* Rank Elevation Progress Bar */}
            <div className="pt-2 space-y-1.5 border-t border-zinc-100">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-zinc-500">Tier Ascension</span>
                <span className="text-zinc-900">
                  {isMaxTier ? "Apex Status Reached" : `${currentAP} / ${currentTier.next} AP`}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full bg-zinc-900 rounded-full transition-all duration-500"
                  style={{ width: `${rankProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Key Metric Bento Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="liquid-glass rounded-3xl p-4 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600">
                <Flame className="w-4 h-4 text-orange-500" />
                <span>Streak Record</span>
              </div>
              <p className="text-2xl font-black tabular-nums text-zinc-900">
                {profile?.current_streak || 0}d
              </p>
              <p className="text-[10px] text-zinc-400 font-semibold">
                Personal Best: {profile?.longest_streak || 0}d
              </p>
            </div>

            <div className="liquid-glass rounded-3xl p-4 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                <Shield className="w-4 h-4 text-blue-500" />
                <span>Active Shields</span>
              </div>
              <p className="text-2xl font-black tabular-nums text-zinc-900">
                {profile?.streak_shields || 0}
              </p>
              <p className="text-[10px] text-zinc-400 font-semibold">
                Auto-defense against skips
              </p>
            </div>
          </div>

          {/* Operator Pass / Subscription Card */}
          <div className="liquid-glass rounded-3xl p-5 border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-zinc-900">Weekly Operator Pass</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                profile?.subscription_status === "active"
                  ? "bg-emerald-500/20 text-emerald-800"
                  : "bg-amber-500/20 text-amber-800"
              }`}>
                {profile?.subscription_status || "Trialing"}
              </span>
            </div>

            <p className="text-xs text-zinc-600 font-medium leading-relaxed">
              {profile?.subscription_status === "active"
                ? "Your ₹10 weekly commitment is live. Full protocol verification, arena ranking, and store redemptions are unlocked."
                : "You are currently running on your 7-day trial pass. Activate the ₹10 weekly stake to preserve streaks and leaderboard status."}
            </p>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>
                  {profile?.trial_ends_at
                    ? `Next Renewal: ${new Date(profile.trial_ends_at).toLocaleDateString([], { month: "short", day: "numeric" })}`
                    : "No renewal scheduled"}
                </span>
              </div>

              <Link
                href="/checkout"
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
              >
                <span>Manage</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Pillar Calibrations */}
          <div className="liquid-glass rounded-3xl p-5 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Calibrated Disciplines
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/60">
                <span className="font-semibold text-zinc-500">Movement Target</span>
                <span className="font-bold text-zinc-900">{profile?.movement_label || "Physical Training"}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/60">
                <span className="font-semibold text-zinc-500">Grind Focus</span>
                <span className="font-bold text-zinc-900">{profile?.grind_label || "Client Deep Work"}</span>
              </div>
            </div>
          </div>

          {/* Account Logout Action */}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full py-3.5 rounded-2xl bg-zinc-100 hover:bg-rose-50 text-zinc-600 hover:text-rose-600 border border-zinc-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {signingOut ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Disconnect Operator Session</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}

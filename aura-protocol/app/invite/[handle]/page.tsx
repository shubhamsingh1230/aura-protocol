// app/invite/[handle]/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { 
  Users, 
  Flame, 
  Sparkles, 
  Shield, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  UserPlus
} from "lucide-react";

interface InviterProfile {
  id: string;
  handle: string;
  full_name: string | null;
  identity_rank: string;
  current_streak: number;
  aura_points: number;
}

export default function InvitePage({ params }: { params: Promise<{ handle: string }> }) {
  const resolvedParams = use(params);
  const cleanHandle = resolvedParams.handle.replace(/^@/, "");

  const [inviter, setInviter] = useState<InviterProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadInviteContext();
  }, [cleanHandle]);

  async function loadInviteContext() {
    setLoading(true);

    // 1. Fetch inviter profile details
    const { data: inviterData } = await supabase
      .from("profiles")
      .select("id, handle, full_name, identity_rank, current_streak, aura_points")
      .ilike("handle", cleanHandle)
      .maybeSingle();

    setInviter(inviterData);

    // 2. Check if current viewer is logged in
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    setLoading(false);
  }

  async function handleAcceptInvite() {
    if (!inviter) return;
    setJoining(true);
    setStatusMessage(null);

    // If user is not logged in, save invite target in localStorage and send to login
    if (!currentUser) {
      if (typeof window !== "undefined") {
        localStorage.setItem("pending_invite_handle", inviter.handle);
      }
      router.push("/login");
      return;
    }

    // Guard: Cannot squad with self
    if (currentUser.id === inviter.id) {
      setStatusMessage("You cannot accept an invitation from your own handle.");
      setJoining(false);
      return;
    }

    // Auto-create mutual accepted squad friendship
    const { error } = await supabase.from("friendships").upsert(
      {
        user_id: currentUser.id,
        friend_id: inviter.id,
        status: "accepted",
      },
      { onConflict: "user_id,friend_id" }
    );

    if (error) {
      setStatusMessage(`Error joining squad: ${error.message}`);
      setJoining(false);
    } else {
      // Send notification to inviter
      await supabase.from("notifications").insert({
        user_id: inviter.id,
        actor_id: currentUser.id,
        type: "friend_request",
        message: `👥 Squad Update: @${currentUser.user_metadata?.handle || "An operator"} joined your squad via your invite link!`,
      });

      router.push("/friends");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        <p className="text-xs text-zinc-400 font-medium">Resolving Squad Transmission...</p>
      </div>
    );
  }

  if (!inviter) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <div className="liquid-glass max-w-sm w-full p-6 rounded-3xl border border-white/80 bg-white/70 text-center space-y-3">
          <Shield className="w-8 h-8 text-zinc-400 mx-auto" />
          <h2 className="text-lg font-bold text-zinc-900">Operator Not Found</h2>
          <p className="text-xs text-zinc-500">
            No active protocol profile is attached to @{cleanHandle}.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-2.5 rounded-xl bg-zinc-900 text-white font-bold text-xs"
          >
            Enter The Aura Protocol
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6 liquid-glass rounded-3xl p-8 border border-white/80 shadow-xl backdrop-blur-xl bg-white/70">
        
        {/* Banner Tag */}
        <div className="flex items-center justify-center">
          <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-bold flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" />
            <span>Squad Invitation</span>
          </div>
        </div>

        {/* Inviter Highlight Card */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-zinc-900 text-white flex items-center justify-center text-xl font-black mx-auto shadow-md">
            {inviter.handle.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              @{inviter.handle}
            </h1>
            <p className="text-xs text-zinc-500 font-medium">
              Has summoned you to join their accountability circle
            </p>
          </div>

          {/* Inviter Vital Badges */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="px-2.5 py-1 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-700 text-[11px] font-extrabold flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-600" />
              {inviter.identity_rank || "Initiate"}
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-700 text-[11px] font-extrabold flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-500" />
              {inviter.current_streak || 0}d Streak
            </span>
          </div>
        </div>

        {/* Protocol Membership Hook */}
        <div className="bg-zinc-100/60 rounded-2xl p-4 space-y-2 border border-zinc-200/50">
          <p className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
            What You Gain in This Squad
          </p>
          <ul className="space-y-1.5 text-xs text-zinc-600 font-medium">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Direct access to @{inviter.handle}&apos;s daily 7-block feed</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Full 7-Day Unrestricted Free Trial Pass</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Real-time mutual streak synchronization</span>
            </li>
          </ul>
        </div>

        {statusMessage && (
          <p className="text-xs font-bold text-rose-600 text-center bg-rose-50 p-2.5 rounded-xl border border-rose-200">
            {statusMessage}
          </p>
        )}

        {/* Action Button */}
        <button
          onClick={handleAcceptInvite}
          disabled={joining}
          className="w-full py-3.5 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          {joining ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Joining Squad...</span>
            </>
          ) : (
            <>
              <span>{currentUser ? "Accept Invitation & Join Squad" : "Claim 7-Day Pass & Join Squad"}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-[10px] text-center text-zinc-400 font-medium">
          No credit card required for the 7-day trial pass.
        </p>

      </div>
    </div>
  );
}

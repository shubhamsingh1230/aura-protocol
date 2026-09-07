// components/feed/FeedClient.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Flame, 
  Flag, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  ShieldAlert, 
  Dumbbell, 
  MonitorPlay, 
  Utensils 
} from "lucide-react";

interface OperatorCard {
  userId: string;
  gymPost: any | null;
  workPost: any | null;
  mealPosts: any[];
  latestTime: string;
}

export default function FeedClient() {
  const [posts, setPosts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [flaggedPostIds, setFlaggedPostIds] = useState<Set<string>>(new Set());
  const [clappedUserIds, setClappedUserIds] = useState<Set<string>>(new Set());
  const [flaggingPost, setFlaggingPost] = useState<{ id: string; targetUserId: string; dailyLogId?: string } | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadFeedData();
  }, []);

  async function loadFeedData() {
    setLoading(true);

    // 1. Fetch recent proofs (Capped to top 30 to enforce Anti-Doomscroll protocol)
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    // 2. Fetch profiles with identity ranks and streaks
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, handle, aura_points, identity_rank, current_streak");

    // 3. Fetch existing moderation flags
    const { data: flagsData } = await supabase
      .from("flags")
      .select("post_id");

    setPosts(postsData || []);
    setProfiles(profilesData || []);
    setFlaggedPostIds(new Set((flagsData || []).map((f: any) => f.post_id)));
    setLoading(false);
  }

  async function handleFlagSubmit() {
    if (!flaggingPost) return;
    setSubmittingFlag(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to flag a proof.");
      setSubmittingFlag(false);
      return;
    }

    const { error } = await supabase.from("flags").insert({
      post_id: flaggingPost.id,
      daily_log_id: flaggingPost.dailyLogId || null,
      flagged_by_user_id: user.id,
      target_user_id: flaggingPost.targetUserId,
      reason: flagReason.trim() || "Community Flagged Invalidation",
    });

    if (error) {
      alert(`Error submitting report: ${error.message}`);
    } else {
      setFlaggedPostIds((prev) => new Set(prev).add(flaggingPost.id));
      alert("Proof flagged. Our automated referee system will review the submission.");
      setFlaggingPost(null);
      setFlagReason("");
    }
    setSubmittingFlag(false);
  }

  function handleToggleAura(userId: string) {
    setClappedUserIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(userId)) {
        updated.delete(userId);
      } else {
        updated.add(userId);
      }
      return updated;
    });
  }

  // Map profiles for O(1) lookups
  const profileMap = new Map();
  (profiles || []).forEach((p: any) => profileMap.set(p.id, p));

  // Group posts into the 7-block daily gauntlet
  const userPostsMap = new Map<string, OperatorCard>();
  (posts || []).forEach((post: any) => {
    if (!userPostsMap.has(post.user_id)) {
      userPostsMap.set(post.user_id, {
        userId: post.user_id,
        gymPost: null,
        workPost: null,
        mealPosts: [],
        latestTime: post.created_at,
      });
    }
    const group = userPostsMap.get(post.user_id)!;
    if (post.activity === "gym" && !group.gymPost) group.gymPost = post;
    else if (post.activity === "deep_work" && !group.workPost) group.workPost = post;
    else if (post.activity === "meal" && group.mealPosts.length < 5) group.mealPosts.push(post);
  });

  const feedCards = Array.from(userPostsMap.values());

  if (loading) {
    return (
      <div className="pt-24 text-center flex flex-col items-center justify-center space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        <p className="text-xs text-zinc-400 font-medium">Syncing Signal Stream...</p>
      </div>
    );
  }

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Feed Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Signal Stream</h1>
        <p className="text-zinc-500 text-sm font-medium">Daily 7-Block Visual Verification</p>
      </div>

      {/* Anti-Doomscroll Protocol Badge */}
      <div className="liquid-glass rounded-2xl p-3 border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-emerald-800 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Anti-Doomscroll Enforced: High-Signal Gauntlet</span>
        </div>
        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Live</span>
      </div>

      {/* Flagging Modal Overlay */}
      {flaggingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="liquid-glass rounded-3xl p-5 max-w-sm w-full border border-white/80 bg-white/95 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <ShieldAlert className="w-5 h-5" />
              <span>Flag Proof Invalidation</span>
            </div>
            <p className="text-xs text-zinc-500 font-medium">
              Specify the issue (e.g. incorrect daily gesture, non-live photo, or blurred workspace).
            </p>
            <input
              type="text"
              placeholder="Reason for flag..."
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setFlaggingPost(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleFlagSubmit}
                disabled={submittingFlag}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {submittingFlag ? <Loader2 className="w-3 h-3 animate-spin" /> : "Submit Flag"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Operator Gauntlet Feed Cards */}
      <div className="space-y-6">
        {feedCards.length > 0 ? (
          feedCards.map((card) => {
            const profile = profileMap.get(card.userId) || {};
            const name = profile.full_name || (profile.handle ? `@${profile.handle}` : `Operator_${card.userId.slice(0, 4)}`);
            const streak = profile.current_streak || 0;
            const rank = profile.identity_rank || "Initiate";
            const timeAgo = new Date(card.latestTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            const anyPost = card.gymPost || card.workPost || card.mealPosts[0];
            const postId = anyPost?.id;
            const dailyLogId = anyPost?.daily_log_id;
            const isFlagged = postId && flaggedPostIds.has(postId);
            const isClapped = clappedUserIds.has(card.userId);

            const blocksCompleted = (card.gymPost ? 1 : 0) + (card.workPost ? 1 : 0) + card.mealPosts.length;

            return (
              <div
                key={card.userId}
                className="liquid-glass rounded-3xl p-5 space-y-4 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70"
              >
                {/* Header: Operator Dossier Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-black text-xs shadow-md">
                      {name.replace(/^@/, "").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-zinc-900">{name}</p>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                          {rank}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-medium">
                        {streak}d streak • {timeAgo}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {postId && (
                      <button
                        onClick={() =>
                          setFlaggingPost({
                            id: postId,
                            targetUserId: card.userId,
                            dailyLogId: dailyLogId,
                          })
                        }
                        className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold ${
                          isFlagged
                            ? "bg-rose-500 text-white"
                            : "bg-zinc-100 hover:bg-rose-50 text-zinc-400 hover:text-rose-600"
                        }`}
                        title="Flag Suspicious Proof"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        {isFlagged && <span className="text-[10px]">Flagged</span>}
                      </button>
                    )}
                  </div>
                </div>

                {/* 7-Block Compliance Matrix */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      7-Block Daily Matrix
                    </p>
                    <span className="text-[10px] font-extrabold text-emerald-600">
                      {blocksCompleted} / 7 Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {/* Workout Block */}
                    <div
                      className={`aspect-square rounded-2xl p-2 flex flex-col justify-between border relative overflow-hidden transition-all ${
                        card.gymPost
                          ? "bg-emerald-500/10 border-emerald-500/30 shadow-sm"
                          : "bg-zinc-100 border-zinc-200/60"
                      }`}
                    >
                      <div className="flex items-center justify-between z-10">
                        <span className="text-[9px] font-bold text-zinc-800 bg-white/70 px-1 rounded backdrop-blur-xs">
                          Workout
                        </span>
                        <Dumbbell className="w-3 h-3 text-zinc-600" />
                      </div>
                      {card.gymPost?.image_url ? (
                        <img
                          src={card.gymPost.image_url}
                          alt="Workout"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[9px] text-zinc-400 font-medium">Pending</span>
                      )}
                      {card.gymPost && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 absolute bottom-1.5 right-1.5 z-10 drop-shadow-md bg-white rounded-full" />
                      )}
                    </div>

                    {/* Grind / Deep Work Block */}
                    <div
                      className={`aspect-square rounded-2xl p-2 flex flex-col justify-between border relative overflow-hidden transition-all ${
                        card.workPost
                          ? "bg-blue-500/10 border-blue-500/30 shadow-sm"
                          : "bg-zinc-100 border-zinc-200/60"
                      }`}
                    >
                      <div className="flex items-center justify-between z-10">
                        <span className="text-[9px] font-bold text-zinc-800 bg-white/70 px-1 rounded backdrop-blur-xs">
                          Grind
                        </span>
                        <MonitorPlay className="w-3 h-3 text-blue-600" />
                      </div>
                      {card.workPost?.image_url ? (
                        <img
                          src={card.workPost.image_url}
                          alt="Grind"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[9px] text-zinc-400 font-medium">Pending</span>
                      )}
                      {card.workPost && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 absolute bottom-1.5 right-1.5 z-10 drop-shadow-md bg-white rounded-full" />
                      )}
                    </div>

                    {/* Meals 1 to 5 Blocks */}
                    {[0, 1, 2, 3, 4].map((mealIdx) => {
                      const meal = card.mealPosts[mealIdx];
                      return (
                        <div
                          key={mealIdx}
                          className={`aspect-square rounded-2xl p-2 flex flex-col justify-between border relative overflow-hidden transition-all ${
                            meal
                              ? "bg-orange-500/10 border-orange-500/30 shadow-sm"
                              : "bg-zinc-100 border-zinc-200/60"
                          }`}
                        >
                          <div className="flex items-center justify-between z-10">
                            <span className="text-[9px] font-bold text-zinc-800 bg-white/70 px-1 rounded backdrop-blur-xs">
                              M{mealIdx + 1}
                            </span>
                            <Utensils className="w-2.5 h-2.5 text-orange-600" />
                          </div>
                          {meal?.image_url ? (
                            <img
                              src={meal.image_url}
                              alt={`Meal ${mealIdx + 1}`}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[9px] text-zinc-400 font-medium">Pending</span>
                          )}
                          {meal && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 absolute bottom-1.5 right-1.5 z-10 drop-shadow-md bg-white rounded-full" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Interaction Bar */}
                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-bold">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span>{streak} Day Protocol</span>
                  </div>

                  <button
                    onClick={() => handleToggleAura(card.userId)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      isClapped
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-zinc-100 hover:bg-zinc-200/70 text-zinc-700"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isClapped ? "Aura Bestowed" : "Bestow Aura"}</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="liquid-glass p-8 rounded-3xl text-center space-y-2 border border-white/80 bg-white/60">
            <Flame className="w-8 h-8 text-zinc-300 mx-auto" />
            <p className="text-sm font-bold text-zinc-700">No activity proofs today</p>
            <p className="text-xs text-zinc-400">Complete your daily gauntlet to populate the signal feed.</p>
          </div>
        )}
      </div>
    </div>
  );
}

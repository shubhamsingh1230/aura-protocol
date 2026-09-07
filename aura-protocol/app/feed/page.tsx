// app/feed/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { 
  Flame, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  Flag, 
  Loader2, 
  Dumbbell, 
  MonitorPlay, 
  Utensils, 
  Users, 
  Globe,
  X,
  AlertTriangle
} from "lucide-react";

interface FeedPost {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  activity: string;
  created_at: string;
  operator: {
    handle: string | null;
    identity_rank: string | null;
    current_streak: number | null;
  };
}

export default function FeedPage() {
  const [scope, setScope] = useState<"global" | "squad">("global");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [flaggingPostId, setFlaggingPostId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [submittingFlag, setSubmittingFlag] = useState(false);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [salutedIds, setSalutedIds] = useState<Set<string>>(new Set());

  const supabase = createClient();

  useEffect(() => {
    loadStream();
  }, [scope]);

  async function loadStream() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let allowedUserIds: string[] | null = null;

    // Filter by squad circle if selected
    if (scope === "squad") {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const squadSet = new Set<string>([user.id]);
      (friendships || []).forEach((f) => {
        squadSet.add(f.user_id === user.id ? f.friend_id : f.user_id);
      });
      allowedUserIds = Array.from(squadSet);
    }

    // Query posts
    let query = supabase
      .from("posts")
      .select(`
        id,
        user_id,
        image_url,
        caption,
        activity,
        created_at,
        operator:profiles!posts_user_id_fkey(handle, identity_rank, current_streak)
      `)
      .order("created_at", { ascending: false })
      .limit(25);

    if (allowedUserIds && allowedUserIds.length > 0) {
      query = query.in("user_id", allowedUserIds);
    }

    const { data: rawPosts } = await query;

    // Query existing flags raised by the current operator
    const { data: userFlags } = await supabase
      .from("post_flags")
      .select("post_id")
      .eq("reporter_id", user.id);

    const flaggedSet = new Set((userFlags || []).map((f) => f.post_id));
    setFlaggedIds(flaggedSet);

    const formattedPosts: FeedPost[] = (rawPosts || []).map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      image_url: p.image_url,
      caption: p.caption,
      activity: p.activity,
      created_at: p.created_at,
      operator: {
        handle: p.operator?.handle || "operator",
        identity_rank: p.operator?.identity_rank || "Initiate",
        current_streak: p.operator?.current_streak || 0,
      },
    }));

    setPosts(formattedPosts);
    setLoading(false);
  }

  async function handleSalute(postId: string) {
    if (salutedIds.has(postId)) return;
    setSalutedIds((prev) => new Set(prev).add(postId));
  }

  async function handleSubmitFlag() {
    if (!flaggingPostId || !flagReason.trim()) return;
    setSubmittingFlag(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("post_flags").insert({
      post_id: flaggingPostId,
      reporter_id: user.id,
      reason: flagReason.trim(),
    });

    if (error) {
      alert(`Flagging failed: ${error.message}`);
    } else {
      setFlaggedIds((prev) => new Set(prev).add(flaggingPostId));
      setFlaggingPostId(null);
      setFlagReason("");
      alert("Flag submitted for referee protocol audit.");
    }
    setSubmittingFlag(false);
  }

  function getActivityMeta(activity: string) {
    switch (activity) {
      case "gym":
        return { label: "Movement", icon: Dumbbell, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" };
      case "deep_work":
        return { label: "Deep Work", icon: MonitorPlay, color: "text-blue-600 bg-blue-500/10 border-blue-500/20" };
      case "meal":
        return { label: "Nutrition", icon: Utensils, color: "text-orange-600 bg-orange-500/10 border-orange-500/20" };
      default:
        return { label: "Protocol", icon: Sparkles, color: "text-zinc-600 bg-zinc-100 border-zinc-200" };
    }
  }

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Flag Modal */}
      {flaggingPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="liquid-glass rounded-3xl p-6 max-w-sm w-full border border-white/80 bg-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="w-5 h-5" />
                <h2 className="text-xs font-black uppercase tracking-wider">Referee Flag Submission</h2>
              </div>
              <button
                onClick={() => {
                  setFlaggingPostId(null);
                  setFlagReason("");
                }}
                className="p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-[11px] text-rose-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Anti-Cheat Protocol
              </p>
              <p className="leading-relaxed">
                Legitimate flags preserve arena integrity. Flagging genuine submissions without cause incurs AP penalties.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block">
                Reason for Invalidation
              </label>
              <select
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-white border border-zinc-200 text-xs font-semibold text-zinc-800 outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="">Select violation type...</option>
                <option value="missing_daily_gesture">Missing today&apos;s anti-cheat gesture</option>
                <option value="recycled_screenshot">Recycled or downloaded photo</option>
                <option value="unrelated_subject">Not proof of claimed pillar</option>
                <option value="obscured_lens">Obscured or black screen capture</option>
              </select>
            </div>

            <button
              onClick={handleSubmitFlag}
              disabled={submittingFlag || !flagReason}
              className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
            >
              {submittingFlag ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Dispatch Referee Audit</span>}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Live Stream
          </span>
          <span className="text-xs text-zinc-400 font-bold">Community Audit</span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Proof Stream</h1>
        <p className="text-zinc-500 text-sm font-medium">Verify peer compliance and flag protocol violations.</p>
      </div>

      {/* Scope Switcher: Global vs Squad */}
      <div className="liquid-glass rounded-2xl p-1.5 flex gap-1 border border-white/80 shadow-sm bg-zinc-200/50 backdrop-blur-md">
        <button
          onClick={() => setScope("global")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            scope === "global" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-zinc-700" />
          <span>Global Stream</span>
        </button>
        <button
          onClick={() => setScope("squad")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            scope === "squad" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Users className="w-3.5 h-3.5 text-emerald-600" />
          <span>Squad Circle</span>
        </button>
      </div>

      {/* Content Feed */}
      {loading ? (
        <div className="pt-20 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <p className="text-xs text-zinc-400 font-medium">Loading telemetry feed...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="liquid-glass p-8 rounded-3xl text-center space-y-2 border border-white/80 bg-white/60">
          <CheckCircle2 className="w-8 h-8 text-zinc-300 mx-auto" />
          <p className="text-sm font-bold text-zinc-800">No telemetry proofs logged</p>
          <p className="text-xs text-zinc-400">
            {scope === "squad"
              ? "None of your squadmates have submitted visual proof today."
              : "No visual proofs currently recorded in the active stream."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const meta = getActivityMeta(post.activity);
            const Icon = meta.icon;
            const isFlagged = flaggedIds.has(post.id);
            const isSaluted = salutedIds.has(post.id);

            return (
              <div
                key={post.id}
                className="liquid-glass rounded-3xl border border-white/80 shadow-sm backdrop-blur-xl bg-white/75 overflow-hidden space-y-3"
              >
                {/* Post Author Card */}
                <div className="p-4 pb-0 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black text-xs">
                      {post.operator.handle?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-900">@{post.operator.handle}</span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                          {post.operator.identity_rank}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-zinc-400 font-semibold">
                        <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                        <span>{post.operator.current_streak}d streak</span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${meta.color}`}>
                    <Icon className="w-3 h-3" />
                    <span>{meta.label}</span>
                  </span>
                </div>

                {/* Proof Image Display */}
                <div className="relative aspect-square w-full bg-zinc-100">
                  <Image
                    src={post.image_url}
                    alt={post.caption || "Verification proof"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 448px) 100vw, 448px"
                  />
                </div>

                {/* Caption & Actions */}
                <div className="p-4 pt-0 space-y-3">
                  <p className="text-xs text-zinc-700 font-medium leading-relaxed">
                    {post.caption}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {new Date(post.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Salute Action */}
                      <button
                        onClick={() => handleSalute(post.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                          isSaluted
                            ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                            : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                        }`}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isSaluted ? "text-emerald-600" : "text-zinc-400"}`} />
                        <span>{isSaluted ? "Saluted" : "Salute"}</span>
                      </button>

                      {/* Flag Action */}
                      <button
                        onClick={() => !isFlagged && setFlaggingPostId(post.id)}
                        disabled={isFlagged}
                        className={`p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer ${
                          isFlagged
                            ? "bg-rose-50 text-rose-500 border border-rose-200 cursor-not-allowed"
                            : "bg-zinc-100 hover:bg-rose-50 hover:text-rose-600 text-zinc-400 active:scale-95"
                        }`}
                        title="Flag proof violation"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

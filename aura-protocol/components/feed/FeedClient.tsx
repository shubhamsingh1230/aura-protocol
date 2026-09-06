"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Flame, Flag, CheckCircle, Loader2 } from "lucide-react";

export default function FeedClient() {
  const [posts, setPosts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [flaggedPostIds, setFlaggedPostIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url');

      const { data: flagsData } = await supabase
        .from('flags')
        .select('post_id');

      setPosts(postsData || []);
      setProfiles(profilesData || []);
      setFlaggedPostIds(new Set((flagsData || []).map((f: any) => f.post_id)));
      setLoading(false);
    }
    loadData();
  }, []);

  async function handleFlagPost(postId: string, targetUserId: string, dailyLogId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("You must be logged in to flag a proof.");

    if (flaggedPostIds.has(postId)) {
      alert("This proof has already been flagged for review.");
      return;
    }

    const { error } = await supabase.from('flags').insert({
      post_id: postId,
      daily_log_id: dailyLogId || null,
      flagged_by_user_id: user.id, // Fixed column name match
      target_user_id: targetUserId,
      reason: 'Community Flagged Proof'
    });

    if (error) {
      alert(`Error flagging post: ${error.message}`);
    } else {
      setFlaggedPostIds(prev => new Set(prev).add(postId));
      alert("Proof successfully flagged and sent to moderators for review.");
    }
  }

  const profileMap = new Map();
  (profiles || []).forEach((p: any) => profileMap.set(p.id, p));

  const userPostsMap = new Map();
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
    const group = userPostsMap.get(post.user_id);
    if (post.activity === 'gym' && !group.gymPost) group.gymPost = post;
    else if (post.activity === 'deep_work' && !group.workPost) group.workPost = post;
    else if (post.activity === 'meal' && group.mealPosts.length < 5) group.mealPosts.push(post);
  });

  const feedCards = Array.from(userPostsMap.values());

  if (loading) {
    return (
      <div className="pt-24 text-center flex flex-col items-center justify-center space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        <p className="text-xs text-zinc-400 font-medium">Syncing Global Feed...</p>
      </div>
    );
  }

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Global Feed</h1>
        <p className="text-zinc-500 text-sm font-medium">Unified Daily Operator Stream</p>
      </div>

      <div className="space-y-6">
        {feedCards.length > 0 ? (
          feedCards.map((card: any) => {
            const profile = profileMap.get(card.userId) || {};
            const name = profile.full_name || profile.username || `Operator_${card.userId.slice(0, 4)}`;
            const timeAgo = new Date(card.latestTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const anyPost = card.gymPost || card.workPost || card.mealPosts[0];
            const postId = anyPost?.id;
            const dailyLogId = anyPost?.daily_log_id;
            const isFlagged = postId && flaggedPostIds.has(postId);

            return (
              <div key={card.userId} className="liquid-glass rounded-3xl p-4 space-y-4 border border-white/80 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                      {name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{name}</p>
                      <p className="text-[10px] text-zinc-400 font-medium">Active today • {timeAgo}</p>
                    </div>
                  </div>
                  
                  {postId && (
                    <button 
                      onClick={() => handleFlagPost(postId, card.userId, dailyLogId)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${
                        isFlagged ? 'bg-red-500 text-white' : 'bg-zinc-100 hover:bg-red-50 text-zinc-400 hover:text-red-500'
                      }`}
                      title="Flag Proof"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      {isFlagged && <span>Flagged</span>}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">Daily 7-Block Compliance</p>
                  
                  <div className="grid grid-cols-4 gap-2">
                    <div className={`aspect-square rounded-2xl p-2 flex flex-col justify-between border relative overflow-hidden ${card.gymPost ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-100 border-zinc-200/60'}`}>
                      <span className="text-[10px] font-bold text-zinc-600">Workout</span>
                      {card.gymPost?.image_url ? (
                        <img src={card.gymPost.image_url} alt="Gym" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-medium">Pending</span>
                      )}
                      {card.gymPost && <CheckCircle className="w-3 h-3 text-emerald-600 absolute bottom-1.5 right-1.5 z-10" />}
                    </div>

                    <div className={`aspect-square rounded-2xl p-2 flex flex-col justify-between border relative overflow-hidden ${card.workPost ? 'bg-blue-500/10 border-blue-500/30' : 'bg-zinc-100 border-zinc-200/60'}`}>
                      <span className="text-[10px] font-bold text-zinc-600">Grind</span>
                      {card.workPost?.image_url ? (
                        <img src={card.workPost.image_url} alt="Grind" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-medium">Pending</span>
                      )}
                      {card.workPost && <CheckCircle className="w-3 h-3 text-blue-600 absolute bottom-1.5 right-1.5 z-10" />}
                    </div>

                    {[0, 1, 2, 3, 4].map((mealIdx) => {
                      const meal = card.mealPosts[mealIdx];
                      return (
                        <div key={mealIdx} className={`aspect-square rounded-2xl p-2 flex flex-col justify-between border relative overflow-hidden ${meal ? 'bg-orange-500/10 border-orange-500/30' : 'bg-zinc-100 border-zinc-200/60'}`}>
                          <span className="text-[10px] font-bold text-zinc-600">Meal {mealIdx + 1}</span>
                          {meal?.image_url ? (
                            <img src={meal.image_url} alt={`Meal ${mealIdx + 1}`} className="absolute inset-0 w-full h-full object-cover opacity-90" />
                          ) : (
                            <span className="text-[10px] text-zinc-400 font-medium">Pending</span>
                          )}
                          {meal && <CheckCircle className="w-3 h-3 text-orange-600 absolute bottom-1.5 right-1.5 z-10" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="liquid-glass p-8 rounded-3xl text-center space-y-2">
            <Flame className="w-8 h-8 text-zinc-300 mx-auto" />
            <p className="text-sm font-bold text-zinc-700">No activity proofs yet</p>
            <p className="text-xs text-zinc-400">Complete your daily pillars to populate the feed.</p>
          </div>
        )}
      </div>
    </div>
  );
}

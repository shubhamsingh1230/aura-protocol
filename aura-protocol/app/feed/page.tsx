import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Flame } from "lucide-react";

export default async function FeedPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  // 1. Fetch all posts directly
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (postsError) {
    console.error("Error fetching posts:", postsError.message);
  }

  // 2. Fetch all profiles to map names/avatars safely
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url');

  const profileMap = new Map();
  (profiles || []).forEach((p) => profileMap.set(p.id, p));

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Global Feed</h1>
        <p className="text-zinc-500 text-sm font-medium">Community Proofs & Activity Stream</p>
      </div>

      <div className="space-y-4">
        {posts && posts.length > 0 ? (
          posts.map((post: any) => {
            const profile = profileMap.get(post.user_id) || {};
            const name = profile.full_name || "Aura Operator";
            const timeAgo = new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={post.id} className="liquid-glass rounded-3xl p-4 space-y-3 border border-white/[0.8] shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs uppercase">
                      {name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{name}</p>
                      <p className="text-[10px] text-zinc-400 font-medium capitalize">{post.activity?.replace('_', ' ')} • {timeAgo}</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold uppercase">
                    Verified
                  </span>
                </div>

                {/* Image Proof */}
                {post.image_url && (
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200/50">
                    <img 
                      src={post.image_url} 
                      alt="Activity Proof" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Caption */}
                {post.caption && (
                  <p className="text-xs text-zinc-700 font-medium px-1">
                    {post.caption}
                  </p>
                )}
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

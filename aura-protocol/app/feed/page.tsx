// app/feed/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FeedClient from "@/components/feed/FeedClient";

export default async function FeedPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  // 1. Fetch posts with author profiles
  const { data: rawPosts } = await supabase
    .from("posts")
    .select(`
      id,
      user_id,
      image_url,
      caption,
      activity,
      created_at,
      operator:profiles!posts_user_id_fkey(
        id,
        handle,
        full_name,
        identity_rank,
        current_streak
      )
    `)
    .order("created_at", { ascending: false })
    .limit(30);

  // 2. Fetch friendships to enable squad filtering
  const { data: friendships } = await supabase
    .from("friendships")
    .select("user_id, friend_id")
    .eq("status", "accepted")
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  const squadUserIds = new Set<string>([user.id]);
  (friendships || []).forEach((f) => {
    squadUserIds.add(f.user_id === user.id ? f.friend_id : f.user_id);
  });

  // 3. Fetch flags raised by current operator to prevent duplicate flags
  const { data: userFlags } = await supabase
    .from("post_flags")
    .select("post_id")
    .eq("reporter_id", user.id);

  const initialFlaggedPostIds = (userFlags || []).map((f) => f.post_id);

  const formattedPosts = (rawPosts || []).map((p: any) => ({
    id: p.id,
    user_id: p.user_id,
    image_url: p.image_url,
    caption: p.caption,
    activity: p.activity,
    created_at: p.created_at,
    operator: {
      handle: p.operator?.handle || "operator",
      full_name: p.operator?.full_name || p.operator?.handle || "Operator",
      identity_rank: p.operator?.identity_rank || "Initiate",
      current_streak: p.operator?.current_streak || 0,
    },
  }));

  return (
    <FeedClient
      initialPosts={formattedPosts}
      squadMemberIds={Array.from(squadUserIds)}
      initialFlaggedPostIds={initialFlaggedPostIds}
      currentUserId={user.id}
    />
  );
}

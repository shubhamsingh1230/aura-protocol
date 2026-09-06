import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import FeedClient from "@/components/feed/FeedClient";

export default async function FeedPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  // Fetch all posts and profiles on the server
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url');

  return (
    <FeedClient 
      initialPosts={posts || []} 
      profiles={profiles || []} 
      currentUserId={user.id} 
    />
  );
}

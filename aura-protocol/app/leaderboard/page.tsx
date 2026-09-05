import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LeaderboardClient from "@/components/leaderboard/LeaderboardClient";

export default async function LeaderboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Recompute 👑/🥶/💀/👶 tags against current totals before rendering.
  await supabase.rpc("refresh_leaderboard_ranks");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, rank_title, total_aura, current_streak, longest_streak")
    .order("total_aura", { ascending: false })
    .limit(100);

  return <LeaderboardClient profiles={profiles ?? []} currentUserId={user.id} />;
}

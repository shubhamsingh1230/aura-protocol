import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FeedClient from "@/components/feed/FeedClient";

export default async function FeedPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: logs } = await supabase
    .from("daily_logs")
    .select(
      `*, profiles:user_id ( display_name, rank_title, current_streak, movement_label, grind_label )`
    )
    .gt("daily_aura_earned", 0)
    .order("updated_at", { ascending: false })
    .limit(30);

  const { data: myFlags } = await supabase
    .from("flags")
    .select("daily_log_id")
    .eq("flagged_by_user_id", user.id);

  const flaggedLogIds = new Set((myFlags ?? []).map((f) => f.daily_log_id));

  return (
    <FeedClient
      currentUserId={user.id}
      logs={logs ?? []}
      flaggedLogIds={Array.from(flaggedLogIds)}
    />
  );
}

// app/arena/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ArenaClient from "@/components/arena/ArenaClient";

export default async function ArenaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch user profile securely
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.onboarding_completed) {
    return redirect("/onboarding");
  }

  // Fetch active bounties involving this user
  const { data: bounties } = await supabase
    .from("bounties")
    .select("*")
    .or(`issuer_id.eq.${user.id},target_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  // Fetch squad friends (other profiles)
  const { data: squadFriends } = await supabase
    .from("profiles")
    .select("id, handle, display_name, identity_rank")
    .neq("id", user.id)
    .limit(20);

  return (
    <ArenaClient
      profile={profile}
      initialBounties={bounties || []}
      squadFriends={squadFriends || []}
    />
  );
}

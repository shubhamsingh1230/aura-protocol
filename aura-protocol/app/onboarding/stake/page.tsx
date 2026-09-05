import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RestakeClient from "./RestakeClient";

export default async function RestakePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, contract_signed_at")
    .eq("id", user.id)
    .single();

  if (!profile?.contract_signed_at) redirect("/onboarding");

  const { data: season } = await supabase.rpc("get_active_season");

  return (
    <RestakeClient
      displayName={profile.display_name}
      email={profile.email}
      stakeInr={season?.entry_stake_inr ?? 10}
    />
  );
}

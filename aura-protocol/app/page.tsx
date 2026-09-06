import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasLiveStakeInActiveSeason } from "@/lib/season";

export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("contract_signed_at")
    .eq("id", user.id)
    .single();

  if (!profile?.contract_signed_at) redirect("/onboarding");

  const { hasStake } = await hasLiveStakeInActiveSeason(user.id);
  if (!hasStake) redirect("/onboarding/stake");

  redirect("/dashboard");
}

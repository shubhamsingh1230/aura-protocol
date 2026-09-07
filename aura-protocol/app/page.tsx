import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasLiveStakeInActiveSeason } from "@/lib/season";
import LandingAuthClient from "@/components/auth/LandingAuthClient";

// 1. Force dynamic rendering: Tells Next.js to NEVER statically build this auth page
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const supabase = createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not logged in, render the welcome landing page with Google & Discord auth directly
  if (!user) {
    return <LandingAuthClient />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("contract_signed_at")
    .eq("id", user.id)
    .single();

  if (!profile?.contract_signed_at) {
    redirect("/onboarding");
  }

  const { hasStake } = await hasLiveStakeInActiveSeason(user.id);
  
  if (!hasStake) {
    redirect("/onboarding/stake");
  }

  // Final redirect straight to Command Center for returning active users
  redirect("/dashboard");
}

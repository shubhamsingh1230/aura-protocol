import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasLiveStakeInActiveSeason } from "@/lib/season";

// 1. Force dynamic rendering: Tells Next.js to NEVER statically build this auth page
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const supabase = createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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

  // Final redirect if all checks pass
  redirect("/dashboard");
  
  // 2. Satisfy the Next.js compiler so it doesn't throw the "Unsupported Component" object error
  return (
    <main className="min-h-screen bg-black">
      {/* Fallback UI that will never actually be seen because redirect() intercepts it */}
    </main>
  );
}

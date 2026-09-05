"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import RazorpayCheckout from "@/components/onboarding/RazorpayCheckout";

export default function RestakeClient({
  displayName,
  email,
  stakeInr,
}: {
  displayName: string;
  email: string;
  stakeInr: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-grey-text text-sm mb-2">A new season just opened</p>
        <h1 className="text-2xl font-semibold mb-4">Back in for Season 1</h1>
        <div className="text-6xl font-bold tabular mb-6">₹{stakeInr}</div>
        <p className="text-grey-text text-[14px] leading-relaxed mb-10 max-w-xs">
          Your contract and pillars carry over — this is just this season's entry stake.
          ≥85% consistency gets it back; anything less joins the pool the Top 3 split.
        </p>

        {error && <p className="text-crimson text-sm mb-4">{error}</p>}

        <RazorpayCheckout
          amountInr={stakeInr}
          displayName={displayName}
          email={email}
          onSuccess={() => router.replace("/dashboard")}
          onError={setError}
        />
      </motion.div>
    </div>
  );
}

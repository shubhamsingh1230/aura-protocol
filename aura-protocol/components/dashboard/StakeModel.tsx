"use client";

import { useState } from "react";
import { ShieldCheck, Zap, Lock } from "lucide-react";

export default function StakeModal() {
  const [staked, setStaked] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleInAppStake() {
    setLoading(true);
    // Simulate secure in-app payment / state update
    setTimeout(() => {
      setLoading(false);
      setStaked(true);
      alert("Stake of ₹10 verified successfully inside Aura Protocol.");
    }, 1200);
  }

  if (staked) {
    return (
      <div className="liquid-glass rounded-3xl p-5 border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-600 rounded-full"><ShieldCheck className="w-5 h-5" /></div>
          <div>
            <p className="text-sm font-bold text-zinc-900">Protocol Stake Active</p>
            <p className="text-xs text-zinc-500">₹100 Secured • Season 1 Immunity</p>
          </div>
        </div>
        <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">Verified</span>
      </div>
    );
  }

  return (
    <div className="liquid-glass rounded-3xl p-5 space-y-4 border border-amber-500/30 bg-amber-500/[0.02]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 text-amber-600 rounded-full"><Zap className="w-4 h-4" /></div>
          <p className="text-sm font-bold text-zinc-900">Season 1 Stake Required</p>
        </div>
        <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full">₹100</span>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">
        Lock your stake to participate in global rankings, unlock the 7-block accountability feed, and compete for the Final Boss tier.
      </p>
      <button
        onClick={handleInAppStake}
        disabled={loading}
        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
      >
        <Lock className="w-4 h-4" />
        {loading ? "Processing Secure Stake..." : "Stake ₹10 In-App"}
      </button>
    </div>
  );
}

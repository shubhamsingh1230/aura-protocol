// app/marketplace/page.tsx
"use client";

import { useState } from "react";
import { Sparkles, Shield, Lock, CheckCircle2, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function MarketplacePage({ profile }: any) {
  const [userProfile, setUserProfile] = useState(profile);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Determine unlocked lobby based on consistency / membership duration
  const activeDays = userProfile?.active_days_count || 1;
  const currentAP = userProfile?.aura_points || 0;

  const lobbies = [
    { name: "Silver Lobby", minDays: 1, unlocked: true, desc: "Standard AP marketplace utilities & streak protections." },
    { name: "Gold Lobby", minDays: 30, unlocked: activeDays >= 30, desc: "Enhanced rewards & higher tier AP marketplace items." },
    { name: "Platinum Lobby", minDays: 60, unlocked: activeDays >= 60, desc: "Advanced gear access and exclusive operator perks." },
    { name: "Titanium Lobby", minDays: 90, unlocked: activeDays >= 90, desc: "High-value real-world items and elite rewards." },
  ];

  async function handleBuyItem(cost: number, itemType: string) {
    if (currentAP < cost) {
      alert("Not enough Aura Points (AP) to purchase this item!");
      return;
    }

    setLoading(true);
    try {
      const newAP = currentAP - cost;
      let updatePayload: any = { aura_points: newAP };

      if (itemType === "shield") {
        updatePayload.streak_shields = (userProfile.streak_shields || 0) + 1;
      }

      const { error } = await supabase.from("profiles").update(updatePayload).eq("id", userProfile.id);
      if (error) throw error;

      setUserProfile((prev: any) => ({ ...prev, ...updatePayload }));
      alert("Purchase successful!");
    } catch (err: any) {
      alert(`Purchase failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pb-28">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">AP Marketplace</h1>
          <p className="text-xs text-zinc-500 font-medium">Spend Aura Points on Protocol Utilities</p>
        </div>
        <div className="liquid-glass px-3 py-1.5 rounded-2xl flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-white/70">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{currentAP} AP</span>
        </div>
      </div>

      {/* Progression Lobbies View */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">Progression Tiers</h2>
        <div className="grid grid-cols-2 gap-2">
          {lobbies.map((lobby, i) => (
            <div key={i} className={`liquid-glass rounded-2xl p-3.5 border ${lobby.unlocked ? "border-emerald-500/30 bg-emerald-500/5" : "border-zinc-200/60 bg-white/40 opacity-70"}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-zinc-800">{lobby.name}</span>
                {lobby.unlocked ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Lock className="w-3.5 h-3.5 text-zinc-400" />}
              </div>
              <p className="text-[10px] text-zinc-500 leading-tight">{lobby.desc}</p>
              {!lobby.unlocked && <span className="text-[9px] font-bold text-amber-600 mt-2 block">Unlocks at {lobby.minDays} Days</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Marketplace Items */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">Available Utilities</h2>
        
        {/* Streak Shield Item */}
        <div className="liquid-glass rounded-2xl p-4 border border-white/80 bg-white/75 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-zinc-900">Streak Shield</span>
            </div>
            <p className="text-[10px] text-zinc-500">Protects your daily consistency streak from unexpected breaks.</p>
          </div>
          <button 
            onClick={() => handleBuyItem(50, "shield")}
            disabled={loading}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer shrink-0"
          >
            50 AP
          </button>
        </div>
      </div>
    </div>
  );
}

// app/store/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  ShoppingBag, 
  Shield, 
  Sparkles, 
  Flame, 
  Coffee, 
  Zap, 
  Check, 
  Loader2, 
  AlertCircle
} from "lucide-react";

interface StoreItem {
  id: string;
  name: string;
  category: "defense" | "recovery" | "multiplier";
  cost: number;
  description: string;
  benefit: string;
  icon: any;
  accent: string;
}

const STORE_ITEMS: StoreItem[] = [
  {
    id: "streak_shield",
    name: "Streak Shield",
    category: "defense",
    cost: 150,
    description: "Automated loss protection. Deploys instantly if you fail to log pillars on an emergency day.",
    benefit: "+1 Shield Inventory",
    icon: Shield,
    accent: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "rest_pass",
    name: "Tactical Rest Pass",
    category: "recovery",
    cost: 100,
    description: "Scheduled central nervous system recovery. Auto-clears your Movement pillar for 24 hours.",
    benefit: "Auto-clears 1 Workout",
    icon: Coffee,
    accent: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "xp_overdrive",
    name: "Aura Overdrive",
    category: "multiplier",
    cost: 200,
    description: "Supercharges behavioral rewards. Doubles all AP earned across all 7 pillars for 24 hours.",
    benefit: "2x AP Yield for 24h",
    icon: Zap,
    accent: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  },
];

export default function StorePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchProfileData();
  }, []);

  async function fetchProfileData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, handle, aura_points, streak_shields, identity_rank")
      .eq("id", user.id)
      .single();

    setProfile(data);
    setLoading(false);
  }

  async function handlePurchase(item: StoreItem) {
    if (!profile) return;
    setStatusMessage(null);

    if (profile.aura_points < item.cost) {
      setStatusMessage({
        text: `Insufficient Aura Points. You need ${item.cost - profile.aura_points} more AP to redeem this.`,
        type: "error",
      });
      return;
    }

    setPurchasingId(item.id);

    const updatedAP = profile.aura_points - item.cost;
    const updatePayload: Record<string, any> = { aura_points: updatedAP };

    if (item.id === "streak_shield") {
      updatePayload.streak_shields = (profile.streak_shields || 0) + 1;
    }

    // 1. Update user profile balances
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", profile.id);

    if (updateError) {
      setStatusMessage({ text: `Transaction failed: ${updateError.message}`, type: "error" });
      setPurchasingId(null);
      return;
    }

    // 2. Record purchase in ledger
    await supabase.from("store_purchases").insert({
      user_id: profile.id,
      item_id: item.id,
      item_name: item.name,
      cost_ap: item.cost,
    });

    // 3. Dispatch confirmation notification
    await supabase.from("notifications").insert({
      user_id: profile.id,
      actor_id: profile.id,
      type: "store_purchase",
      message: `🛍️ Marketplace Transaction: Redeemed ${item.name} for ${item.cost} AP.`,
    });

    setProfile((prev: any) => ({
      ...prev,
      ...updatePayload,
    }));

    setStatusMessage({
      text: `Successfully acquired ${item.name}! Applied to your dossier.`,
      type: "success",
    });

    setPurchasingId(null);
  }

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Title & AP Treasury Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Marketplace</h1>
          <p className="text-zinc-500 text-sm font-medium">Protocol Asset Exchange</p>
        </div>

        <div className="liquid-glass px-3.5 py-2 rounded-2xl flex items-center gap-1.5 border border-white/80 shadow-sm text-xs font-black text-emerald-600 backdrop-blur-xl bg-white/70">
          <Sparkles className="w-4 h-4" />
          <span>{loading ? "..." : profile?.aura_points || 0} AP</span>
        </div>
      </div>

      {/* Operator Vault Overview */}
      <div className="liquid-glass rounded-3xl p-5 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Inventory</p>
          <p className="text-sm font-black text-zinc-800">
            {profile?.identity_rank || "Initiate"} Reserve
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-1.5 text-xs font-bold text-blue-700">
            <Shield className="w-3.5 h-3.5" />
            <span>{profile?.streak_shields || 0} Shields</span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold border flex items-center gap-2 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-rose-50 border-rose-200 text-rose-600"
          }`}
        >
          {statusMessage.type === "success" ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-4">
        {STORE_ITEMS.map((item) => {
          const Icon = item.icon;
          const isAffordable = (profile?.aura_points || 0) >= item.cost;
          const isBuying = purchasingId === item.id;

          return (
            <div
              key={item.id}
              className="liquid-glass rounded-3xl p-5 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${item.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900">{item.name}</h2>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
                      {item.benefit}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-zinc-900 flex items-center gap-1 justify-end">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    {item.cost}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400">AP</span>
                </div>
              </div>

              <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                {item.description}
              </p>

              <button
                onClick={() => handlePurchase(item)}
                disabled={!isAffordable || isBuying}
                className={`w-full py-3 rounded-2xl font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isAffordable
                    ? "bg-zinc-900 hover:bg-zinc-800 text-white"
                    : "bg-zinc-200 text-zinc-500 shadow-none"
                }`}
              >
                {isBuying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transacting...</span>
                  </>
                ) : isAffordable ? (
                  <>
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Redeem Item ({item.cost} AP)</span>
                  </>
                ) : (
                  <span>Need {item.cost - (profile?.aura_points || 0)} More AP</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

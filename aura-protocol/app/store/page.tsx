// app/store/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  ShoppingBag, 
  Sparkles, 
  Coffee, 
  Film, 
  Utensils, 
  Gift, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";

interface RewardItem {
  id: string;
  title: string;
  category: string;
  costAP: number;
  valueINR: number;
  minTier: string;
  icon: any;
  description: string;
}

const REWARDS_CATALOG: RewardItem[] = [
  {
    id: "food-100",
    title: "₹100 Food Voucher",
    category: "Dining",
    costAP: 1500,
    valueINR: 100,
    minTier: "Bronze",
    icon: Utensils,
    description: "Instant digital code redeemable on Swiggy or Zomato orders.",
  },
  {
    id: "coffee-100",
    title: "₹100 Coffee Voucher",
    category: "Beverage",
    costAP: 1400,
    valueINR: 100,
    minTier: "Bronze",
    icon: Coffee,
    description: "Single-use digital coupon for cafe outlets and coffee pickups.",
  },
  {
    id: "movie-200",
    title: "₹200 Movie Voucher",
    category: "Entertainment",
    costAP: 2700,
    valueINR: 200,
    minTier: "Silver",
    icon: Film,
    description: "BookMyShow discount pass valid on any cinema booking.",
  },
  {
    id: "shopping-250",
    title: "₹250 Retail Pass",
    category: "Shopping",
    costAP: 3200,
    valueINR: 250,
    minTier: "Gold",
    icon: Gift,
    description: "Official digital gift voucher for Amazon Pay or Flipkart.",
  },
];

export default function StorePage() {
  const [profile, setProfile] = useState<any>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadStoreData();
  }, []);

  async function loadStoreData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, aura_points, subscription_status, identity_rank")
      .eq("id", user.id)
      .single();

    const { data: redemptionsData } = await supabase
      .from("reward_redemptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setProfile(profileData);
    setRedemptions(redemptionsData || []);
    setLoading(false);
  }

  async function handleRedeem(item: RewardItem) {
    if (!profile) return;
    setNotification(null);

    // 1. Economic guard: Block trial accounts from draining rewards
    if (profile.subscription_status !== "active") {
      setNotification({
        text: "Redemption locked. You must be an active subscriber (₹10/wk pass) to claim real-world rewards.",
        type: "error",
      });
      return;
    }

    // 2. Check points balance
    if ((profile.aura_points || 0) < item.costAP) {
      setNotification({
        text: `Insufficient AP. You need ${item.costAP - (profile.aura_points || 0)} more Aura Points to unlock this reward.`,
        type: "error",
      });
      return;
    }

    setRedeemingId(item.id);

    const updatedPoints = profile.aura_points - item.costAP;

    // 3. Deduct points from profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ aura_points: updatedPoints })
      .eq("id", profile.id);

    if (profileError) {
      setNotification({ text: `Transaction failed: ${profileError.message}`, type: "error" });
      setRedeemingId(null);
      return;
    }

    // 4. Record redemption entry for moderation/fulfillment
    const { error: redemptionError } = await supabase
      .from("reward_redemptions")
      .insert({
        user_id: profile.id,
        reward_id: item.id,
        title: item.title,
        cost_ap: item.costAP,
        status: "pending",
      });

    if (redemptionError) {
      setNotification({ text: `Failed to register order: ${redemptionError.message}`, type: "error" });
    } else {
      setNotification({
        text: `Successfully claimed ${item.title}! Your voucher code will be processed within 24 hours.`,
        type: "success",
      });
      setProfile((prev: any) => ({ ...prev, aura_points: updatedPoints }));
      await loadStoreData();
    }

    setRedeemingId(null);
  }

  if (loading) {
    return (
      <div className="pt-24 text-center flex flex-col items-center justify-center space-y-2">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        <p className="text-xs text-zinc-400 font-medium">Syncing Aura Treasury...</p>
      </div>
    );
  }

  const isSubscribed = profile?.subscription_status === "active";

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Header Banner */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Aura Marketplace</h1>
        <p className="text-zinc-500 text-sm font-medium">Redeem Consistency for Real-World Value</p>
      </div>

      {/* Balance Card */}
      <div className="liquid-glass rounded-3xl p-5 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
          <span>Available Treasury Balance</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[10px]">
            {profile?.identity_rank || "Initiate"} Tier
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-zinc-900">{profile?.aura_points || 0}</span>
          <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
            <Sparkles className="w-4 h-4" /> AP
          </span>
        </div>

        {!isSubscribed && (
          <div className="pt-3 border-t border-zinc-200/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>Redemptions Locked (Trial Pass)</span>
            </div>
            <Link
              href="/checkout"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
            >
              <span>Activate Pass</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold border flex items-start gap-2.5 ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-600"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Rewards Catalog */}
      <div className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
          Authorized Vouchers & Passes
        </p>

        <div className="grid grid-cols-1 gap-3">
          {REWARDS_CATALOG.map((item) => {
            const Icon = item.icon;
            const canAfford = (profile?.aura_points || 0) >= item.costAP;
            const isLocked = !isSubscribed;

            return (
              <div
                key={item.id}
                className="liquid-glass rounded-3xl p-4 border border-white/80 shadow-sm backdrop-blur-xl bg-white/70 flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-700 shadow-inner">
                    <Icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{item.title}</p>
                    <p className="text-[11px] text-zinc-400 font-medium">{item.description}</p>
                    <span className="text-[10px] font-extrabold text-emerald-600 mt-1 inline-block">
                      {item.costAP} AP
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleRedeem(item)}
                  disabled={redeemingId === item.id || !canAfford || isLocked}
                  className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                    isLocked || !canAfford
                      ? "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200"
                      : "bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer"
                  }`}
                >
                  {redeemingId === item.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isLocked ? (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </>
                  ) : (
                    <span>Claim</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historical Redemptions */}
      {redemptions.length > 0 && (
        <div className="space-y-3 pt-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
            Redemption History
          </p>

          <div className="space-y-2">
            {redemptions.map((redemption) => (
              <div
                key={redemption.id}
                className="liquid-glass rounded-2xl p-3.5 border border-white/80 shadow-sm backdrop-blur-md bg-white/60 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-zinc-800">{redemption.title}</p>
                  <p className="text-[10px] text-zinc-400 font-medium">
                    {new Date(redemption.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      redemption.status === "delivered"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {redemption.status}
                  </span>
                  {redemption.voucher_code && (
                    <p className="text-[10px] font-mono font-bold text-zinc-600 mt-1">
                      {redemption.voucher_code}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

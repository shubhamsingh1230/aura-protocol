// app/checkout/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Shield, Sparkles, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  async function handleSubscribe() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }

    // Update profile subscription status to active in Supabase
    const { error } = await supabase
      .from("profiles")
      .update({ subscription_status: "active" })
      .eq("id", user.id);

    if (error) {
      alert(`Error activating subscription: ${error.message}`);
      setLoading(false);
    } else {
      alert("Subscription activated! Welcome to the Elite Operator Tier.");
      router.push("/feed");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6 liquid-glass rounded-3xl p-8 border border-white/80 shadow-xl backdrop-blur-xl bg-white/70">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Your Free Trial Has Concluded</h1>
          <p className="text-xs text-zinc-500 font-medium">
            Protect your streak, keep your accumulated Aura Points, and maintain access to The Aura Protocol.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>The Operator Membership</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-zinc-900">₹10</span>
            <span className="text-xs font-bold text-zinc-400">/ week (Billed weekly)</span>
          </div>
          <ul className="space-y-2 text-xs text-zinc-600 font-medium pt-2 border-t border-emerald-500/10">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Unlimited 7-block daily compliance logging</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Streak shield and identity rank progression</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Full access to the Aura Reward Marketplace</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>100% Ad-free, clutter-free personal OS</span>
            </li>
          </ul>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-4 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing Membership...</span>
            </>
          ) : (
            <>
              <span>Activate Weekly Pass (₹10)</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-[10px] text-center text-zinc-400">
          Cancel anytime. Your data and streak are securely preserved.
        </p>

      </div>
    </div>
  );
}

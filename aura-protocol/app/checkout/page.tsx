// app/checkout/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Shield, Sparkles, CheckCircle2, Loader2, ArrowRight, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // Helper to dynamically load Razorpay standard checkout script
  function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handleRazorpayCheckout() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) {
      alert("Failed to load Razorpay payment gateway. Please check your internet connection.");
      setLoading(false);
      return;
    }

    // 1. Create order on backend
    const res = await fetch("/api/razorpay/create-order", { method: "POST" });
    const orderData = await res.json();

    if (!res.ok || orderData.error) {
      alert(`Order initialization failed: ${orderData.error || "Unknown error"}`);
      setLoading(false);
      return;
    }

    // 2. Open Razorpay Checkout Modal
    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "The Aura Protocol",
      description: "Weekly Operator Pass (₹10/wk)",
      order_id: orderData.orderId,
      prefill: {
        email: user.email || "",
      },
      theme: {
        color: "#10b981", // Emerald accent matching liquid glass
      },
      handler: async function (response: any) {
        // 3. Cryptographically verify signature
        const verifyRes = await fetch("/api/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            userId: user.id,
          }),
        });

        const verifyData = await verifyRes.json();

        if (verifyRes.ok && verifyData.success) {
          alert("⚡ Payment Verified! Welcome to the Active Operator Tier.");
          router.push("/dashboard");
        } else {
          alert(`Verification failed: ${verifyData.error || "Please contact support"}`);
          setLoading(false);
        }
      },
      modal: {
        ondismiss: function () {
          setLoading(false);
        },
      },
    };

    const razorpayInstance = new window.Razorpay(options);
    razorpayInstance.open();
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6 liquid-glass rounded-3xl p-8 border border-white/80 shadow-xl backdrop-blur-xl bg-white/70">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">The Operator Pass</h1>
          <p className="text-xs text-zinc-500 font-medium">
            Maintain unbroken accountability, preserve your streaks, and keep your accumulated Aura Points.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Weekly Access Tier</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-zinc-900">₹10</span>
            <span className="text-xs font-bold text-zinc-400">/ week (Micro-pledge)</span>
          </div>
          <ul className="space-y-2 text-xs text-zinc-600 font-medium pt-2 border-t border-emerald-500/10">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Unlimited 7-pillar daily proof logging</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Full streak shield & rank elevation engine</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Store marketplace reward redemptions unlocked</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>100% Ad-free personal productivity OS</span>
            </li>
          </ul>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRazorpayCheckout}
          disabled={loading}
          className="w-full py-4 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting Razorpay...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Activate Pass with UPI / Card (₹10)</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-[10px] text-center text-zinc-400">
          Secured by Razorpay. 256-bit encrypted checkout. Cancel anytime.
        </p>

      </div>
    </div>
  );
}

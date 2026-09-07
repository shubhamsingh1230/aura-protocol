"use client";

import { useState } from "react";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowRight, Shield } from "lucide-react";

interface RazorpayCheckoutProps {
  amountInr: number;
  displayName: string;
  email: string;
  onSuccess: () => void;
  onError: (err: string) => void;
}

export default function RazorpayCheckout({
  amountInr,
  displayName,
  email,
  onSuccess,
  onError,
}: RazorpayCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const supabase = createClient();

  async function handlePayment() {
    if (!scriptLoaded) {
      onError("Razorpay SDK still loading. Please retry in a moment.");
      return;
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keyId) {
      onError("CRITICAL: Razorpay Public Key is missing from environment variables.");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Operator authentication expired.");

      // 1. Create order on server
      const orderRes = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountInr }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Order creation failed.");

      // 2. Launch Razorpay modal
      const options = {
        key: keyId, // Safely pulled from env
        amount: orderData.amount,
        currency: orderData.currency,
        name: "The Aura Protocol",
        description: "Weekly Skin-in-the-Game Stake",
        order_id: orderData.orderId || orderData.id,
        prefill: {
          name: displayName,
          email: email,
        },
        theme: {
          color: "#18181b", // zinc-900
        },
        handler: async function (response: any) {
          try {
            // 3. Verify signature cryptographically on server
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                user_id: user.id,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Signature verification failed.");

            onSuccess();
          } catch (verifyErr: any) {
            onError(verifyErr.message);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.open();
    } catch (err: any) {
      onError(err.message || "Failed to initialize payment gateway.");
      setLoading(false);
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptLoaded(true)}
      />
      <button
        onClick={handlePayment}
        disabled={loading || !scriptLoaded}
        className="w-full py-4 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-40 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Connecting Razorpay Gateway...</span>
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Lock ₹{amountInr} Stake & Enter Console</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </>
  );
}

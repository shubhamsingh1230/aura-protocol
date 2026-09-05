"use client";

import { useState } from "react";
import { motion } from "framer-motion";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function RazorpayCheckout({
  amountInr,
  displayName,
  email,
  onSuccess,
  onError,
}: {
  amountInr: number;
  displayName: string;
  email: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const scriptOk = await loadRazorpayScript();
      if (!scriptOk) throw new Error("Couldn't load the payment sheet. Check your connection.");

      const orderRes = await fetch("/api/payments/create-order", { method: "POST" });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? "Couldn't start the payment.");

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "The Aura Protocol",
        description: `₹${amountInr} season entry stake`,
        prefill: { name: displayName, email },
        theme: { color: "#34C759" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
          const result = await verifyRes.json();
          if (!verifyRes.ok) {
            onError(result.error ?? "Payment verification failed.");
            return;
          }
          onSuccess();
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      razorpay.open();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handlePay}
      disabled={loading}
      className="w-full bg-mint text-black font-semibold rounded-card py-3.5 disabled:opacity-50"
    >
      {loading ? "Opening secure checkout…" : `Stake ₹${amountInr} via UPI/Razorpay`}
    </motion.button>
  );
}

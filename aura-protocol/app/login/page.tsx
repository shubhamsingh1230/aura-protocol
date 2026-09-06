"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 1. Add a mounted state
  const [mounted, setMounted] = useState(false);

  // 2. Safely trigger the render only after the browser is fully ready
  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  // 3. Return a safe, empty background during the server-render phase
  if (!mounted) {
    return <div className="min-h-screen bg-canvas" />;
  }

  return (
    <div className="flex flex-col justify-center min-h-screen px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <p className="text-grey-text text-sm tracking-wide mb-2">Season 1</p>
        <h1 className="text-4xl font-semibold leading-tight mb-3">
          THE AURA
          <br />
          PROTOCOL
        </h1>
        <p className="text-grey-text text-[15px] leading-relaxed mb-10">
          Stake ₹100. Show up for seven pillars a day. Whoever fakes it, gets flagged.
          Whoever grinds, runs the leaderboard.
        </p>

        {sent ? (
          <div className="glass rounded-card p-5">
            <p className="text-mint font-medium mb-1">Check your inbox</p>
            <p className="text-grey-text text-sm">
              We sent a sign-in link to {email}. Open it on this device to continue.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 relative">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // Added suppressHydrationWarning to keep extensions from breaking the input
              suppressHydrationWarning 
              className="w-full bg-card border border-border rounded-card px-4 py-3.5 text-[15px] placeholder:text-grey-flat outline-none focus:border-mint"
            />
            {error && <p className="text-crimson text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-mint text-black font-semibold rounded-card py-3.5 disabled:opacity-50 transition-opacity"
            >
              {loading ? "Sending link…" : "Enter the Protocol"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

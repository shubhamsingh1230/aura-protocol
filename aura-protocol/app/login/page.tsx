"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [mounted, setMounted] = useState(false);

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

  if (!mounted) {
    return <div className="min-h-screen bg-[#050507]" />;
  }

  return (
    <div className="flex flex-col justify-center min-h-screen px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm mx-auto"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4 tracking-wider uppercase">
          Season 1
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight text-white mb-3">
          THE AURA
          <span className="block text-emerald-400">PROTOCOL</span>
        </h1>
        
        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          Stake ₹100. Show up for seven pillars a day. Whoever fakes it, gets flagged. Whoever grinds, runs the leaderboard.
        </p>

        {sent ? (
          <div className="liquid-glass rounded-2xl p-6 border border-emerald-500/30 bg-emerald-500/5">
            <h3 className="text-emerald-400 font-semibold text-base mb-1">Check your inbox</h3>
            <p className="text-zinc-300 text-sm leading-relaxed">
              We sent a secure sign-in link to <span className="text-white font-medium">{email}</span>. Open it on this device to enter.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                suppressHydrationWarning
                className="w-full liquid-glass rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl bg-emerald-500 text-zinc-950 font-semibold py-3.5 px-4 text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-50 transition-all duration-200"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? "Authenticating..." : "Enter the Protocol"}
              </span>
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [mounted, setMounted] = useState(false);

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

  if (!mounted) {
    return <div className="min-h-screen bg-[#050507]" />;
  }

  return (
    <div className="flex flex-col justify-center min-h-screen px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm mx-auto"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4 tracking-wider uppercase">
          Season 1
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight text-white mb-3">
          THE AURA
          <span className="block text-emerald-400">PROTOCOL</span>
        </h1>
        
        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          Stake ₹100. Show up for seven pillars a day. Whoever fakes it, gets flagged. Whoever grinds, runs the leaderboard.
        </p>

        {sent ? (
          <div className="liquid-glass rounded-2xl p-6 border border-emerald-500/30 bg-emerald-500/5">
            <h3 className="text-emerald-400 font-semibold text-base mb-1">Check your inbox</h3>
            <p className="text-zinc-300 text-sm leading-relaxed">
              We sent a secure sign-in link to <span className="text-white font-medium">{email}</span>. Open it on this device to enter.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                suppressHydrationWarning
                className="w-full liquid-glass rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-xl bg-emerald-500 text-zinc-950 font-semibold py-3.5 px-4 text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-50 transition-all duration-200"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? "Authenticating..." : "Enter the Protocol"}
              </span>
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

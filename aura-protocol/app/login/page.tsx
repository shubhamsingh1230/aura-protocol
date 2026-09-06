"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Chrome } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  if (!mounted) {
    return <div className="min-h-screen bg-[#050507]" />;
  }

  return (
    <div className="flex flex-col justify-center min-h-screen px-6 py-12 max-w-sm mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full space-y-6"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium tracking-wider uppercase">
          Season 1
        </div>
        
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-3">
            THE AURA
            <span className="block text-emerald-400">PROTOCOL</span>
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Stake ₹100. Show up for seven pillars a day. Whoever fakes it, gets flagged. Whoever grinds, runs the leaderboard.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full relative group overflow-hidden rounded-2xl bg-white text-zinc-950 font-bold py-4 px-6 text-sm shadow-xl hover:bg-zinc-100 active:scale-[0.99] disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer"
        >
          <Chrome className="w-5 h-5 text-emerald-600" />
          <span>{loading ? "Connecting to Google..." : "Continue with Google"}</span>
        </button>

        <p className="text-center text-xs text-zinc-500">
          Instant access. Your Google display name and profile are automatically synced to your operator profile.
        </p>
      </motion.div>
    </div>
  );
}

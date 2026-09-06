"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

export default function LoginPage() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleOAuthLogin(provider: 'google' | 'discord') {
    setLoadingProvider(provider);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoadingProvider(null);
    }
  }

  if (!mounted) {
    return <div className="min-h-screen bg-[#050507]" />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 max-w-md mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full space-y-8"
      >
        {/* Brand Icon & Season Badge */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 rounded-3xl liquid-glass flex items-center justify-center border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <Flame className="w-8 h-8 text-emerald-500 animate-pulse" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wider uppercase">
            Season 1 Protocol
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            THE AURA
            <span className="block text-emerald-400">PROTOCOL</span>
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">
            Stake ₹100. Show up for seven pillars a day. Whoever fakes it, gets flagged. Whoever grinds, runs the leaderboard.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left">
            {error}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3 w-full">
          {/* Google Login Button */}
          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={loadingProvider !== null}
            className="w-full relative group overflow-hidden rounded-2xl bg-white text-zinc-950 font-bold py-4 px-6 text-sm shadow-xl hover:bg-zinc-100 active:scale-[0.99] disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.19v3.15C3.17 21.36 7.23 24 12 24z"/>
              <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.39-1.49-.39-2.24s.14-1.52.39-2.24V6.6H1.19C.43 8.13 0 9.87 0 12s.43 3.87 1.19 5.4l4.08-3.16z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.17 2.64 1.19 6.6l4.08 3.15c.95-2.85 3.6-4.99 6.73-4.99z"/>
            </svg>
            <span>{loadingProvider === 'google' ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>

          {/* Discord Login Button */}
          <button
            onClick={() => handleOAuthLogin('discord')}
            disabled={loadingProvider !== null}
            className="w-full relative group overflow-hidden rounded-2xl bg-[#5865F2] text-white font-bold py-4 px-6 text-sm shadow-xl hover:bg-[#4752C4] active:scale-[0.99] disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>{loadingProvider === 'discord' ? "Connecting to Discord..." : "Continue with Discord"}</span>
          </button>
        </div>

        <p className="text-center text-xs text-zinc-500">
          Secure, instant authentication. Your display name and avatar sync automatically.
        </p>
      </motion.div>
    </div>
  );
}

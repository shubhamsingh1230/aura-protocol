// app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { 
  Flame, 
  Shield, 
  Mail, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Sparkles
} from "lucide-react";

export default function LoginPage() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Optional email magic link state for local development / non-OAuth access
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleOAuthLogin(provider: "google" | "discord") {
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

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setEmailLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setEmailSent(true);
    }
    setEmailLoading(false);
  }

  if (!mounted) {
    return <div className="min-h-screen" />;
  }

  return (
    // STRIPPED: Removed the hardcoded bg-gradient so globals.css background blobs show through
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 max-w-md mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        // STRIPPED: Removed backdrop-blur-2xl and bg-white/75. Let liquid-glass do the work.
        className="w-full space-y-6 p-8 rounded-3xl liquid-glass shadow-2xl"
      >
        {/* Emblem & Season Badge */}
        <div className="flex flex-col items-center space-y-2.5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-sm">
            <Flame className="w-8 h-8 text-emerald-600 animate-pulse" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[11px] font-extrabold tracking-wider uppercase">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Season 1 Protocol</span>
          </div>
        </div>

        {/* Title & Directive */}
        <div className="space-y-1.5">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">
            THE AURA
            <span className="block text-emerald-600">PROTOCOL</span>
          </h1>
          <p className="text-zinc-600 text-xs sm:text-sm leading-relaxed max-w-xs mx-auto font-medium">
            Stake ₹10 weekly. Verify all 7 daily pillars with anti-cheat camera proofs. Maintain your streak, unlock AP dividends, and climb the Arena.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/50 text-rose-600 text-xs text-left font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary OAuth Actions */}
        <div className="space-y-3 w-full pt-1">
          {/* Google One-Tap */}
          <button
            onClick={() => handleOAuthLogin("google")}
            disabled={loadingProvider !== null || emailLoading}
            className="w-full relative group overflow-hidden rounded-2xl bg-white/90 border border-white/40 text-zinc-900 font-bold py-3.5 px-5 text-xs shadow-sm hover:bg-white active:scale-[0.99] disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer"
          >
            {loadingProvider === "google" ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.19v3.15C3.17 21.36 7.23 24 12 24z" />
                <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.39-1.49-.39-2.24s.14-1.52.39-2.24V6.6H1.19C.43 8.13 0 9.87 0 12s.43 3.87 1.19 5.4l4.08-3.16z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.17 2.64 1.19 6.6l4.08 3.15c.95-2.85 3.6-4.99 6.73-4.99z" />
              </svg>
            )}
            <span>{loadingProvider === "google" ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>

          {/* Discord One-Tap */}
          <button
            onClick={() => handleOAuthLogin("discord")}
            disabled={loadingProvider !== null || emailLoading}
            className="w-full relative group overflow-hidden rounded-2xl bg-[#5865F2]/90 hover:bg-[#4752C4] border border-[#5865F2]/20 text-white font-bold py-3.5 px-5 text-xs shadow-sm active:scale-[0.99] disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer"
          >
            {loadingProvider === "discord" ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            )}
            <span>{loadingProvider === "discord" ? "Connecting to Discord..." : "Continue with Discord"}</span>
          </button>
        </div>

        {/* Optional Secondary Passwordless Email Option */}
        <div className="pt-2 border-t border-zinc-200/50">
          {!showEmailAuth ? (
            <button
              onClick={() => setShowEmailAuth(true)}
              className="text-[11px] font-bold text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              Sign in via email magic link →
            </button>
          ) : emailSent ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/50 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Magic link dispatched! Check your inbox.</span>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-2 text-left">
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="operator@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/70 border border-white/80 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailAuth(false)}
                  className="px-3 py-2 bg-white/50 hover:bg-white/80 border border-white/60 text-zinc-600 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailLoading || !email.trim()}
                  className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
                >
                  {emailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Send Magic Link</span>}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-[10px] text-zinc-500 font-medium">
          Instant authentication. Operator aliases, streaks, and AP sync automatically across sessions.
        </p>
      </motion.div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getDeviceTimezoneOffset } from "@/lib/timezone";
import RazorpayCheckout from "@/components/onboarding/RazorpayCheckout";

const STAKE_INR = 10;

const CONTRACT_TERMS = [
  "I will log all 7 pillars — 5 meals, 1 Movement, 1 Grind — with a live camera photo, every day.",
  "I understand faked or stolen photos can be flagged by other members and reviewed.",
  "I understand a false flag I raise against someone else costs me 10 Aura.",
  "I get 1 Rest Token per week to auto-clear Movement on a day I need it.",
  `My ₹${STAKE_INR} stake is on the line. Hit 85% consistency and I get it back — drop below that and it joins the pool the Top 3 split.`,
];

type Step = "contract" | "sign" | "customize" | "stake";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>("contract");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [signature, setSignature] = useState("");
  const [movementLabel, setMovementLabel] = useState("");
  const [grindLabel, setGrindLabel] = useState("");
  const [calorieGoal, setCalorieGoal] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const fallback = data.user?.email?.split("@")[0] ?? "";
      setDisplayName((prev) => prev || fallback);
      setEmail(data.user?.email ?? "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSign() {
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? "",
      display_name: displayName.trim() || "Contender",
      timezone_offset: getDeviceTimezoneOffset(),
      contract_signed_at: new Date().toISOString(),
    });

    if (error) {
      setError(error.message);
      return;
    }
    setStep("customize");
  }

  async function handleCustomize() {
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const parsedGoal = parseInt(calorieGoal, 10);

    const { error } = await supabase
      .from("profiles")
      .update({
        movement_label: movementLabel.trim() || "Movement",
        grind_label: grindLabel.trim() || "Grind",
        calorie_goal: Number.isNaN(parsedGoal) ? null : parsedGoal,
      })
      .eq("id", user.id);

    if (error) {
      setError(error.message);
      return;
    }
    setStep("stake");
  }

  return (
    <div className="min-h-screen flex flex-col px-6 pt-14 pb-10">
      <AnimatePresence mode="wait">
        {step === "contract" && (
          <motion.div
            key="contract"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col"
          >
            <p className="text-grey-text text-sm mb-2">Before you start</p>
            <h1 className="text-2xl font-semibold mb-6">The Aura Contract</h1>

            <div className="space-y-3 flex-1">
              {CONTRACT_TERMS.map((term, i) => (
                <div key={i} className="glass rounded-card p-4 flex gap-3">
                  <span className="text-mint mt-0.5">✓</span>
                  <p className="text-[14px] leading-relaxed text-ink/80">{term}</p>
                </div>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep("sign")}
              className="mt-6 w-full bg-mint text-black font-semibold rounded-card py-3.5"
            >
              I understand the terms
            </motion.button>
          </motion.div>
        )}

        {step === "sign" && (
          <motion.div
            key="sign"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col"
          >
            <p className="text-grey-text text-sm mb-2">Make it official</p>
            <h1 className="text-2xl font-semibold mb-6">Sign the Protocol</h1>

            <label className="text-sm text-grey-text mb-2 block">Display name on the leaderboard</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What people will see"
              className="w-full bg-card border border-border rounded-card px-4 py-3.5 mb-6 outline-none focus:border-mint"
            />

            <label className="text-sm text-grey-text mb-2 block">
              Type your full name to sign
            </label>
            <input
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Full name"
              className="w-full bg-card border border-border rounded-card px-4 py-3.5 font-medium tracking-wide outline-none focus:border-mint"
              style={{ fontFamily: "cursive" }}
            />

            {error && <p className="text-crimson text-sm mt-3">{error}</p>}

            <div className="flex-1" />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSign}
              disabled={signature.trim().length < 2 || !displayName.trim()}
              className="w-full bg-mint text-black font-semibold rounded-card py-3.5 disabled:opacity-30"
            >
              Sign & continue
            </motion.button>
          </motion.div>
        )}

        {step === "customize" && (
          <motion.div
            key="customize"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col"
          >
            <p className="text-grey-text text-sm mb-2">Make it yours</p>
            <h1 className="text-2xl font-semibold mb-6">Name your pillars</h1>
            <p className="text-grey-text text-[14px] leading-relaxed mb-6">
              The Gauntlet is fixed — 5 meals, Movement, Grind — but what those look like is
              yours. Name them so the dashboard talks like your actual life.
            </p>

            <label className="text-sm text-grey-text mb-2 block">
              What's your Movement? (e.g. "Leg Day", "5K Splits")
            </label>
            <input
              value={movementLabel}
              onChange={(e) => setMovementLabel(e.target.value)}
              placeholder="Movement"
              className="w-full bg-card border border-border rounded-card px-4 py-3.5 mb-6 outline-none focus:border-mint"
            />

            <label className="text-sm text-grey-text mb-2 block">
              What's your Grind? (e.g. "BugParallax Edits", "B.Tech Modules")
            </label>
            <input
              value={grindLabel}
              onChange={(e) => setGrindLabel(e.target.value)}
              placeholder="Grind"
              className="w-full bg-card border border-border rounded-card px-4 py-3.5 mb-6 outline-none focus:border-mint"
            />

            <label className="text-sm text-grey-text mb-2 block">
              Daily calorie target (optional)
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={calorieGoal}
              onChange={(e) => setCalorieGoal(e.target.value)}
              placeholder="e.g. 2200"
              className="w-full bg-card border border-border rounded-card px-4 py-3.5 outline-none focus:border-mint"
            />

            {error && <p className="text-crimson text-sm mt-3">{error}</p>}

            <div className="flex-1" />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCustomize}
              className="w-full bg-mint text-black font-semibold rounded-card py-3.5"
            >
              Continue
            </motion.button>
          </motion.div>
        )}

        {step === "stake" && (
          <motion.div
            key="stake"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col items-center justify-center text-center"
          >
            <div className="text-6xl font-bold tabular mb-2">₹{STAKE_INR}</div>
            <p className="text-grey-text text-[15px] mb-3 max-w-xs">
              This is your skin in the game for the season.
            </p>
            <div className="glass rounded-card p-4 mb-10 text-left text-[13px] leading-relaxed text-ink/70 max-w-xs">
              <p className="mb-2">
                <span className="text-mint font-medium">≥85% consistency</span> (26/30 days) —
                your ₹{STAKE_INR} comes straight back.
              </p>
              <p>
                <span className="text-gold font-medium">Below that</span> — it joins the pool.
                Top 3 by Aura split it winner-takes-most, unless two or more people run a
                flawless 100% — then they split it evenly instead.
              </p>
            </div>

            {error && <p className="text-crimson text-sm mb-4">{error}</p>}

            <RazorpayCheckout
              amountInr={STAKE_INR}
              displayName={displayName}
              email={email}
              onSuccess={() => router.replace("/dashboard")}
              onError={setError}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

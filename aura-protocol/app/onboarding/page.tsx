// app/onboarding/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getDeviceTimezoneOffset } from "@/lib/timezone";
import RazorpayCheckout from "@/components/onboarding/RazorpayCheckout";
import { 
  Shield, 
  Flame, 
  Sparkles, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  Dumbbell,
  Laptop,
  Check
} from "lucide-react";

const STAKE_INR = 10;

const CONTRACT_TERMS = [
  "I will log all daily pillars — nutrition, physical training, and deep work — with genuine live proof every day.",
  "I understand faked or recycled proofs can be flagged by fellow operators and invalidated by the protocol referee.",
  "I receive 1 Streak Shield upon initiation to defend my streak against emergency disruptions.",
  "I understand raising false flags against other members penalizes my accumulated Aura Points.",
  `My ₹${STAKE_INR} weekly commitment is on the line. Hit ≥85% consistency and unlock full rewards; fall below and accountability takes over.`,
];

type Step = "contract" | "sign" | "customize" | "stake";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>("contract");
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [signature, setSignature] = useState("");
  const [movementLabel, setMovementLabel] = useState("");
  const [grindLabel, setGrindLabel] = useState("");
  const [calorieGoal, setCalorieGoal] = useState("");
  const [checkingHandle, setCheckingHandle] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const userEmail = data.user?.email ?? "";
      const baseName = userEmail.split("@")[0] ?? "";
      setEmail(userEmail);
      setDisplayName((prev) => prev || baseName);
      setHandle((prev) => prev || baseName.toLowerCase().replace(/[^a-z0-9_]/g, ""));
    });
  }, []);

  // Debounced handle validation
  useEffect(() => {
    if (!handle.trim() || handle.length < 3) {
      setHandleAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingHandle(true);
      const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");

      const { data: { user } } = await supabase.auth.getUser();

      const { data } = await supabase
        .from("profiles")
        .select("id")
        .ilike("handle", cleanHandle)
        .neq("id", user?.id || "")
        .maybeSingle();

      setHandleAvailable(!data);
      setCheckingHandle(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [handle]);

  async function handleSign() {
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!handleAvailable && handleAvailable !== null) {
      setError("Please choose an available operator handle.");
      return;
    }

    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || `op_${user.id.slice(0, 5)}`;

    const { error: updateError } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? "",
      full_name: displayName.trim() || cleanHandle,
      display_name: displayName.trim() || cleanHandle,
      handle: cleanHandle,
      identity_rank: "Initiate",
      timezone_offset: getDeviceTimezoneOffset(),
      contract_signed_at: new Date().toISOString(),
    });

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setStep("customize");
  }

  async function handleCustomize() {
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const parsedGoal = parseInt(calorieGoal, 10);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        movement_label: movementLabel.trim() || "Movement",
        grind_label: grindLabel.trim() || "Grind",
        calorie_goal: Number.isNaN(parsedGoal) ? null : parsedGoal,
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setStep("stake");
  }

  async function handleStakeSuccess() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/dashboard");
      return;
    }

    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 7);

    // Credit starting operator assets: 1 shield, 50 AP, active pass
    await supabase
      .from("profiles")
      .update({
        subscription_status: "active",
        trial_ends_at: trialEnds.toISOString(),
        streak_shields: 1,
        aura_points: 50,
      })
      .eq("id", user.id);

    // Queue welcome protocol transmission
    await supabase.from("notifications").insert({
      user_id: user.id,
      actor_id: user.id,
      type: "welcome",
      message: "🛡️ Operator Dossier Activated: 1 Streak Shield and 50 AP credited to your profile. Welcome to the Arena.",
    });

    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full liquid-glass rounded-3xl p-6 sm:p-8 border border-white/80 shadow-2xl backdrop-blur-2xl bg-white/75 flex flex-col">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(["contract", "sign", "customize", "stake"] as Step[]).map((s, idx) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === s ? "w-8 bg-zinc-900" : "w-2 bg-zinc-200"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: CONTRACT */}
          {step === "contract" && (
            <motion.div
              key="contract"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col space-y-4"
            >
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Protocol Initiation</p>
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">The Aura Contract</h1>
              </div>

              <div className="space-y-2.5">
                {CONTRACT_TERMS.map((term, i) => (
                  <div key={i} className="liquid-glass rounded-2xl p-3.5 flex gap-3 border border-zinc-200/60 bg-white/60">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <p className="text-xs leading-relaxed text-zinc-700 font-medium">{term}</p>
                  </div>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep("sign")}
                className="mt-4 w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-2xl py-3.5 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>I Understand & Accept Terms</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}

          {/* STEP 2: SIGN & HANDLE */}
          {step === "sign" && (
            <motion.div
              key="sign"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col space-y-4"
            >
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Dossier Calibration</p>
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Sign the Protocol</h1>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                    Display Name
                  </label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Leaderboard alias"
                    className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-xs font-semibold text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                    Unique Operator Handle (@)
                  </label>
                  <div className="relative">
                    <input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="handle_name"
                      className="w-full bg-white border border-zinc-200 rounded-2xl pl-8 pr-10 py-3 text-xs font-semibold font-mono text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <span className="absolute left-3 top-3 text-zinc-400 text-xs font-mono">@</span>
                    <div className="absolute right-3.5 top-3">
                      {checkingHandle ? (
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                      ) : handleAvailable === true ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : handleAvailable === false ? (
                        <span className="text-[10px] text-rose-500 font-bold">Taken</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                    Signature (Type Full Legal Name)
                  </label>
                  <input
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Digital Signature"
                    className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    style={{ fontFamily: "cursive" }}
                  />
                </div>
              </div>

              {error && <p className="text-rose-600 text-xs font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">{error}</p>}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSign}
                disabled={signature.trim().length < 2 || !displayName.trim() || handleAvailable === false}
                className="mt-4 w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-2xl py-3.5 shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
              >
                <span>Ratify & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}

          {/* STEP 3: CUSTOMIZE PILLARS */}
          {step === "customize" && (
            <motion.div
              key="customize"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col space-y-4"
            >
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Pillar Customization</p>
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Name Your Pillars</h1>
                <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                  Tailor your pillars to match your daily workflow and athletic goals.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Dumbbell className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Movement Focus</span>
                  </label>
                  <input
                    value={movementLabel}
                    onChange={(e) => setMovementLabel(e.target.value)}
                    placeholder="e.g. Strength Training, Running, Calisthenics"
                    className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-xs font-semibold text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Laptop className="w-3.5 h-3.5 text-blue-600" />
                    <span>Grind / Deep Work Focus</span>
                  </label>
                  <input
                    value={grindLabel}
                    onChange={(e) => setGrindLabel(e.target.value)}
                    placeholder="e.g. Video Production, CS Modules, Meta Ads"
                    className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-xs font-semibold text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                    Daily Calorie Target (Optional)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={calorieGoal}
                    onChange={(e) => setCalorieGoal(e.target.value)}
                    placeholder="e.g. 2400"
                    className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-xs font-semibold text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {error && <p className="text-rose-600 text-xs font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">{error}</p>}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCustomize}
                className="mt-4 w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-2xl py-3.5 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Save Pillars & Proceed to Stake</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}

          {/* STEP 4: STAKE */}
          {step === "stake" && (
            <motion.div
              key="stake"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-xs">
                <Flame className="w-6 h-6" />
              </div>

              <div>
                <div className="text-5xl font-black text-zinc-900 tabular-nums">₹{STAKE_INR}</div>
                <p className="text-xs text-zinc-500 font-semibold mt-1">Weekly Skin-in-the-Game Stake</p>
              </div>

              <div className="liquid-glass rounded-2xl p-4 text-left text-xs leading-relaxed space-y-2 border border-zinc-200/70 bg-white/60 w-full">
                <p className="text-zinc-700">
                  <strong className="text-emerald-600">≥85% Consistency:</strong> Complete your pillars and your ₹{STAKE_INR} is preserved while earning AP dividends.
                </p>
                <p className="text-zinc-700">
                  <strong className="text-amber-600">Below 85%:</strong> Stake enters the community reward pool divided among the top-ranked operators in The Arena.
                </p>
              </div>

              {error && <p className="text-rose-600 text-xs font-bold">{error}</p>}

              <div className="w-full pt-2">
                <RazorpayCheckout
                  amountInr={STAKE_INR}
                  displayName={displayName}
                  email={email}
                  onSuccess={handleStakeSuccess}
                  onError={(err) => setError(typeof err === "string" ? err : "Payment failed")}
                />
              </div>

              <p className="text-[10px] text-zinc-400">
                1 Streak Shield + 50 AP immediately credited upon payment verification.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

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
  Check,
  User,
  AlertCircle,
  Zap,
  Gift
} from "lucide-react";

const SUBSCRIPTION_INR = 10;

const CONTRACT_TERMS = [
  "I will track and verify my daily movement and deep work pillars using genuine anti-cheat camera proofs.",
  "I understand that recycled, bypassed, or faked proofs will be flagged and invalidated by the protocol system.",
  "I receive 1 Streak Shield and 50 Aura Points (AP) instantly upon starting my free trial.",
  "I understand that raising false flags on peer proofs penalizes my own accumulated Aura Points.",
  `My ₹${SUBSCRIPTION_INR} weekly maintenance subscription keeps the utility ad-free, maintains streak protections, and unlocks progressive AP lobbies.`,
];

type Step = "contract" | "sign" | "customize" | "trial";

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

  // Check if user is logged in AND if they already finished onboarding
  useEffect(() => {
    async function checkOnboardingStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

      if (profile?.onboarding_completed) {
        router.replace("/dashboard");
        return;
      }

      const userEmail = user.email ?? "";
      const baseName = userEmail.split("@")[0] ?? "";
      setEmail(userEmail);
      setDisplayName((prev) => prev || baseName);
      setHandle((prev) => prev || baseName.toLowerCase().replace(/[^a-z0-9_]/g, ""));
    }

    checkOnboardingStatus();
  }, [router, supabase]);

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
  }, [handle, supabase]);

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
      onboarding_completed: true,
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
        movement_label: movementLabel.trim() || "Physical Training",
        grind_label: grindLabel.trim() || "Deep Work Block",
        calorie_goal: Number.isNaN(parsedGoal) ? null : parsedGoal,
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setStep("trial");
  }

  async function handleTrialSuccess() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/dashboard");
      return;
    }

    // Set 7-day free trial expiration window
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 7);

    // 1. Credit starting assets & activate 7-day trial status
    await supabase
      .from("profiles")
      .update({
        subscription_status: "trialing",
        trial_ends_at: trialEnds.toISOString(),
        streak_shields: 1,
        aura_points: 50,
        earned_ap: 50,
        current_streak: 1,
        longest_streak: 1,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    // 2. Initialize Today's Daily Log entry
    const todayDate = new Date().toISOString().split("T")[0];
    await supabase
      .from("daily_logs")
      .upsert(
        {
          user_id: user.id,
          log_date: todayDate,
          meals_logged: 0,
          gym_done: false,
          editing_done: false,
        },
        { onConflict: "user_id,log_date" }
      );

    // 3. Queue welcome notification
    await supabase.from("notifications").insert({
      user_id: user.id,
      actor_id: user.id,
      type: "welcome",
      message: "🎁 7-Day Free Trial Activated: 1 Streak Shield and 50 AP credited to your profile. Enjoy full utility access!",
      is_read: false,
    });

    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-emerald-50/40 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full liquid-glass rounded-3xl p-6 sm:p-8 border border-white/80 shadow-2xl backdrop-blur-2xl bg-white/75 flex flex-col">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(["contract", "sign", "customize", "trial"] as Step[]).map((s) => (
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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[10px] font-extrabold uppercase tracking-widest mb-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Protocol Agreement</span>
                </div>
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">The Productivity Charter</h1>
              </div>

              <div className="space-y-2.5">
                {CONTRACT_TERMS.map((term, i) => (
                  <div key={i} className="liquid-glass rounded-2xl p-3.5 flex gap-3 border border-zinc-200/60 bg-white/60 shadow-xs">
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
                <span>I Accept & Agree</span>
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
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Operator Identity</h1>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block mb-1">
                    Display Name / Alias
                  </label>
                  <div className="relative">
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Leaderboard alias"
                      className="w-full bg-white border border-zinc-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                    />
                    <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                  </div>
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
                      className="w-full bg-white border border-zinc-200 rounded-2xl pl-8 pr-10 py-3 text-xs font-semibold font-mono text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                    />
                    <span className="absolute left-3 top-3 text-zinc-400 text-xs font-mono font-bold">@</span>
                    <div className="absolute right-3.5 top-3.5">
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
                    Digital Signature (Full Legal Name)
                  </label>
                  <input
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="Sign Charter Agreement"
                    className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                    style={{ fontFamily: "cursive" }}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setStep("contract")}
                  className="px-4 py-3.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold text-xs"
                >
                  Back
                </button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSign}
                  disabled={signature.trim().length < 2 || !displayName.trim() || handleAvailable === false}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-2xl py-3.5 shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
                >
                  <span>Ratify & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
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
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Configure Your Daily Pillars</h1>
                <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                  Tailor your daily movement and deep work focuses for anti-cheat verification.
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
                    className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-xs font-semibold text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
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
                    placeholder="e.g. Video Production, Coding, Design"
                    className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-xs font-semibold text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
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
                    className="w-full bg-white border border-zinc-200 rounded-2xl px-4 py-3 text-xs font-semibold text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setStep("sign")}
                  className="px-4 py-3.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold text-xs"
                >
                  Back
                </button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCustomize}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-2xl py-3.5 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Save Pillars & Proceed</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: TRIAL ACTIVATION */}
          {step === "trial" && (
            <motion.div
              key="trial"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-xs border border-emerald-500/20">
                <Gift className="w-6 h-6 text-emerald-600" />
              </div>

              <div>
                <div className="text-3xl font-black text-zinc-900">7 Days Free Trial</div>
                <p className="text-xs text-zinc-500 font-semibold mt-1">Full access to anti-cheat tracking, arenas & AP lobbies</p>
              </div>

              <div className="liquid-glass rounded-2xl p-4 text-left text-xs leading-relaxed space-y-2 border border-zinc-200/70 bg-white/60 w-full shadow-xs">
                <p className="text-zinc-700">
                  <strong className="text-emerald-600">Zero Upfront Charge:</strong> Enjoy full real-time utility access for 7 days completely free. 
                </p>
                <p className="text-zinc-700">
                  <strong className="text-zinc-900">After 7 Days:</strong> Continue your productivity game for just <span className="font-bold text-emerald-600">₹{SUBSCRIPTION_INR} weekly</span> to keep ads away and maintenance active.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold flex items-center gap-2 w-full text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="w-full pt-2">
                <button
                  onClick={handleTrialSuccess}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-2xl py-4 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Activate 7-Day Free Trial & Enter Console</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>1 Streak Shield + 50 AP immediately credited upon initiation.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

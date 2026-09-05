"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const HOLD_MS = 1500;
const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function LongPressFlag({
  alreadyFlaggedByMe,
  onConfirmFlag,
}: {
  alreadyFlaggedByMe: boolean;
  onConfirmFlag: () => Promise<void> | void;
}) {
  const [holding, setHolding] = useState(false);
  const [justFlagged, setJustFlagged] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHold = useCallback(() => {
    if (alreadyFlaggedByMe || justFlagged) return;
    setHolding(true);
    timerRef.current = setTimeout(async () => {
      setHolding(false);
      setJustFlagged(true);
      await onConfirmFlag();
    }, HOLD_MS);
  }, [alreadyFlaggedByMe, justFlagged, onConfirmFlag]);

  const cancelHold = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHolding(false);
  }, []);

  const flagged = alreadyFlaggedByMe || justFlagged;

  return (
    <button
      type="button"
      disabled={flagged}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-14 h-14 flex items-center justify-center select-none touch-none"
      aria-label="Hold to flag this entry"
    >
      <svg width="56" height="56" className="absolute inset-0 -rotate-90">
        <circle
          cx="28"
          cy="28"
          r={RADIUS}
          fill="rgba(255,59,48,0.06)"
          stroke="rgba(255,59,48,0.25)"
          strokeWidth="3"
        />
        {holding && (
          <motion.circle
            cx="28"
            cy="28"
            r={RADIUS}
            fill="none"
            stroke="#FF3B30"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: HOLD_MS / 1000, ease: "linear" }}
            style={{ filter: "drop-shadow(0 0 6px rgba(255,59,48,0.7))" }}
          />
        )}
      </svg>

      <AnimatePresence mode="wait">
        {flagged ? (
          <motion.span
            key="flagged"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-crimson text-lg"
          >
            🚩
          </motion.span>
        ) : (
          <motion.span
            key="unflagged"
            animate={holding ? { scale: 1.15 } : { scale: 1 }}
            className="text-white/70 text-lg"
          >
            ⚑
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

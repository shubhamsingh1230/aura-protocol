"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

export default function GestureBanner({
  label,
  emoji,
  verified,
  onToggleVerified,
}: {
  label: string;
  emoji: string;
  verified: boolean;
  onToggleVerified: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="glass rounded-card px-4 py-3 mb-5"
    >
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <p className="text-[11px] text-grey-text tracking-wide mb-0.5">TODAY'S GESTURE</p>
          <p className="text-[15px] font-medium">{label}</p>
        </div>
        <span className="text-3xl leading-none">{emoji}</span>
      </div>

      {/*
        There's no automated way to confirm a gesture actually appears in a
        photo — that's real computer vision, out of scope here. This is a
        self-attestation instead: it gives the community feed something
        concrete to check ("they said they showed it — do the photos back
        that up?") which the long-press flag mechanic then enforces socially,
        rather than silently claiming a verification that isn't happening.
      */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onToggleVerified}
        className={clsx(
          "w-full flex items-center justify-center gap-2 rounded-pill py-2 text-[13px] font-medium transition-colors",
          verified
            ? "bg-mint/15 text-mint border border-mint/30"
            : "bg-card-active text-grey-text border border-border"
        )}
      >
        <span>{verified ? "✓" : "○"}</span>
        {verified ? "Gesture shown in today's photos" : "Mark gesture as shown"}
      </motion.button>
    </motion.div>
  );
}

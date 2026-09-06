"use client";

import { useState } from "react";
import { Crown, Flame, Check, ShieldAlert } from "lucide-react";
import clsx from "clsx";

interface FeedCardProps {
  username: string;
  badge: string;
  points: string;
  images: { label: string; src?: string; status?: string }[];
  statusText?: string;
}

export default function FeedCard({
  username,
  badge,
  points,
  images,
  statusText,
}: FeedCardProps) {
  const [flagging, setFlagging] = useState(false);
  const [flagProgress, setFlagProgress] = useState(0);

  // Simulation for the "hold-to-flag" interaction you designed
  let holdTimer: NodeJS.Timeout;

  const handleTouchStart = () => {
    setFlagging(true);
    setFlagProgress(0);
    // Smooth progress fill logic can go here
  };

  const handleTouchEnd = () => {
    setFlagging(false);
    setFlagProgress(0);
  };

  return (
    <div 
      className="liquid-glass rounded-3xl p-5 mb-4 relative overflow-hidden transition-all duration-300 group"
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar with subtle gradient ring */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center border border-white/10 shadow-inner text-xs font-semibold tracking-wider text-white">
            {username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium tracking-tight text-white">{username}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.04] border border-white/[0.08] text-amber-300 tracking-wide backdrop-blur-md">
                <Crown className="w-3 h-3 text-amber-400" />
                {badge}
              </span>
            </div>
          </div>
        </div>

        {/* Aura Points Pill */}
        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-tight backdrop-blur-md">
          {points}
        </div>
      </div>

      {/* Media / Proof Grid - Sub-glass containers */}
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        {images.map((img, idx) => (
          <div 
            key={idx} 
            className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-black/40 border border-white/[0.06] flex flex-col justify-end p-3 group/item"
          >
            {img.src ? (
              <img 
                src={img.src} 
                alt={img.label} 
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover/item:scale-105 transition-transform duration-500" 
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">
                No visual uploaded
              </div>
            )}
            
            {/* Inner glass label tag */}
            <div className="relative z-10 px-2.5 py-1 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 self-start text-[11px] text-zinc-300 font-medium">
              {img.label}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Status */}
      {statusText && (
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <span className="flex items-center gap-1.5 text-emerald-400/90 font-medium">
            <Check className="w-3.5 h-3.5" />
            {statusText}
          </span>
          <span className="text-[10px] text-zinc-600 tracking-wider uppercase">Hold to flag</span>
        </div>
      )}
    </div>
  );
}

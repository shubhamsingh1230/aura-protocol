// components/arena/ArenaClient.tsx
"use client";

import { useState } from "react";
import { Trophy, Swords, Sparkles, Shield, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ArenaClient({ profile, initialBounties, squadFriends }: any) {
  const [userProfile, setUserProfile] = useState(profile);
  const [bounties, setBounties] = useState(initialBounties || []);
  const [targetFriendId, setTargetFriendId] = useState("");
  const [wagerAmount, setWagerAmount] = useState(25);
  const [bountyTask, setBountyTask] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const currentAP = userProfile?.aura_points ?? 0;

  async function handleIssueBounty(e: React.FormEvent) {
    e.preventDefault();
    if (!targetFriendId || !bountyTask.trim()) return;
    if (currentAP < wagerAmount) {
      alert("Insufficient Aura Points (AP) to cover this bounty wager!");
      return;
    }

    setLoading(true);
    try {
      // 1. Deduct AP from issuer as an escrow wager
      const newAP = currentAP - wagerAmount;
      await supabase.from("profiles").update({ aura_points: newAP }).eq("id", userProfile.id);

      // 2. Create the bounty card record
      const { data, error } = await supabase.from("bounties").insert({
        issuer_id: userProfile.id,
        target_id: targetFriendId,
        task_description: bountyTask,
        ap_wager: wagerAmount,
        status: "active"
      }).select().single();

      if (error) throw error;

      setUserProfile((prev: any) => ({ ...prev, aura_points: newAP }));
      setBounties([data, ...bounties]);
      setBountyTask("");
      alert("🎯 Bounty Card issued successfully!");
    } catch (err: any) {
      alert(`Error issuing bounty: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pb-28">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">The Arena</h1>
          <p className="text-xs text-zinc-500 font-medium">Friend Squad Bounties & Global Status</p>
        </div>
        <div className="liquid-glass px-3 py-1.5 rounded-2xl flex items-center gap-1.5 text-xs font-black text-emerald-600 bg-white/70">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{currentAP} AP</span>
        </div>
      </div>

      {/* Issue Bounty Card Form */}
      <div className="liquid-glass rounded-3xl p-5 border border-white/80 shadow-sm bg-white/75 space-y-4">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-emerald-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-800">Issue Bounty Card</h2>
        </div>

        <form onSubmit={handleIssueBounty} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Select Squadmate</label>
            <select 
              value={targetFriendId} 
              onChange={(e) => setTargetFriendId(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-2xl px-3 py-2.5 text-xs font-semibold text-zinc-900 outline-none"
            >
              <option value="">Choose friend...</option>
              {squadFriends?.map((f: any) => (
                <option key={f.id} value={f.id}>@{f.handle}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Challenge Task</label>
            <input 
              type="text"
              value={bountyTask}
              onChange={(e) => setBountyTask(e.target.value)}
              placeholder="e.g. Complete 50 pushups by 6 PM"
              className="w-full bg-white border border-zinc-200 rounded-2xl px-3 py-2.5 text-xs font-semibold text-zinc-900 outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">AP Wager ({wagerAmount} AP)</label>
            <input 
              type="range" 
              min="10" 
              max="100" 
              step="5"
              value={wagerAmount}
              onChange={(e) => setWagerAmount(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-2xl py-3 shadow-md transition-all cursor-pointer"
          >
            {loading ? "Issuing..." : `Deploy Bounty (${wagerAmount} AP Wager)`}
          </button>
        </form>
      </div>

      {/* Active Bounties List */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">Active Squad Bounties</h2>
        {bounties.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-6">No active bounties in your squad.</p>
        ) : (
          bounties.map((b: any) => (
            <div key={b.id} className="liquid-glass rounded-2xl p-4 border border-zinc-200/70 bg-white/60 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-800">Wager: {b.ap_wager} AP</span>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 font-bold rounded-lg text-[10px]">Active Challenge</span>
              </div>
              <p className="text-xs text-zinc-600 font-medium">{b.task_description}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

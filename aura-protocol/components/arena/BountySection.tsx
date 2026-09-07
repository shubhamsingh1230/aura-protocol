"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, XCircle, Upload, Shield, Clock } from "lucide-react";

interface Bounty {
  id: string;
  task_title: string;
  ap_stake: number;
  status: "pending_acceptance" | "active" | "completed" | "failed" | "declined";
  challenger_id: string;
  target_id: string;
  proof_url: string | null;
}

export default function BountySection({ 
  bounties, 
  currentUserId, 
  onRefresh 
}: { 
  bounties: Bounty[]; 
  currentUserId: string; 
  onRefresh: () => void; 
}) {
  const [proofInput, setProofInput] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const supabase = createClient();

  // Handle Bounty Acceptance
  async function handleAcceptBounty(bountyId: string) {
    setLoadingId(bountyId);
    await supabase
      .from("arena_bounties")
      .update({ status: "active" })
      .eq("id", bountyId);
    
    onRefresh();
    setLoadingId(null);
  }

  // Handle Bounty Decline (Refunds AP to challenger)
  async function handleDeclineBounty(bountyId: string, challengerId: string, stake: number) {
    setLoadingId(bountyId);
    
    // 1. Refund challenger's vault AP from escrow
    const { data: challenger } = await supabase
      .from("profiles")
      .select("vault_ap")
      .eq("id", challengerId)
      .single();

    if (challenger) {
      await supabase
        .from("profiles")
        .update({ vault_ap: (challenger.vault_ap || 0) + stake })
        .eq("id", challengerId);
    }

    // 2. Mark bounty as declined
    await supabase
      .from("arena_bounties")
      .update({ status: "declined" })
      .eq("id", bountyId);

    onRefresh();
    setLoadingId(null);
  }

  // Handle Proof Upload & Settlement
  async function handleSubmitProof(bounty: Bounty) {
    const url = proofInput[bounty.id];
    if (!url) return;

    setLoadingId(bounty.id);

    // 1. Update bounty with proof and set status to completed
    await supabase
      .from("arena_bounties")
      .update({ status: "completed", proof_url: url })
      .eq("id", bounty.id);

    // 2. Transfer escrowed AP to the target operator's vault
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("vault_ap")
      .eq("id", bounty.target_id)
      .single();

    if (targetProfile) {
      await supabase
        .from("profiles")
        .update({ vault_ap: (targetProfile.vault_ap || 0) + bounty.ap_stake })
        .eq("id", bounty.target_id);
    }

    onRefresh();
    setLoadingId(null);
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1">Active Arena Bounties</h3>
      {bounties.length === 0 ? (
        <div className="liquid-glass p-6 rounded-3xl text-center text-xs text-zinc-400 bg-white/60 border">
          No active bounties in this arena. Deploy a wager above.
        </div>
      ) : (
        bounties.map((bounty) => {
          const isTarget = bounty.target_id === currentUserId;
          const isChallenger = bounty.challenger_id === currentUserId;

          return (
            <div key={bounty.id} className="liquid-glass p-4 rounded-3xl bg-white/80 border space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                  {bounty.ap_stake} Vault AP Stake
                </span>
                <span className="text-[10px] font-bold uppercase text-zinc-400">{bounty.status.replace("_", " ")}</span>
              </div>

              <div>
                <p className="text-sm font-bold text-zinc-900">{bounty.task_title}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Verification required via telemetry link or screenshot proof.</p>
              </div>

              {/* Action branch for Target Operator */}
              {isTarget && bounty.status === "pending_acceptance" && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleAcceptBounty(bounty.id)}
                    disabled={loadingId === bounty.id}
                    className="flex-1 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Accept Challenge
                  </button>
                  <button
                    onClick={() => handleDeclineBounty(bounty.id, bounty.challenger_id, bounty.ap_stake)}
                    disabled={loadingId === bounty.id}
                    className="px-4 py-2 bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl"
                  >
                    Decline
                  </button>
                </div>
              )}

              {/* Proof submission interface when active */}
              {isTarget && bounty.status === "active" && (
                <div className="space-y-2 pt-1">
                  <input
                    type="url"
                    placeholder="Paste proof URL (Screenshot / Strava / GitHub link)"
                    value={proofInput[bounty.id] || ""}
                    onChange={(e) => setProofInput({ ...proofInput, [bounty.id]: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border text-xs outline-none"
                  />
                  <button
                    onClick={() => handleSubmitProof(bounty)}
                    disabled={loadingId === bounty.id || !proofInput[bounty.id]}
                    className="w-full py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Submit Proof & Claim {bounty.ap_stake} AP</span>
                  </button>
                </div>
              )}

              {bounty.status === "completed" && bounty.proof_url && (
                <div className="text-[11px] text-emerald-600 font-medium bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                  Verified Proof: <a href={bounty.proof_url} target="_blank" rel="noreferrer" className="underline font-bold">View Telemetry Link</a>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

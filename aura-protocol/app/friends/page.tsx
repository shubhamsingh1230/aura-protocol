// app/friends/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Users, 
  UserPlus, 
  Flame, 
  Shield, 
  Check, 
  X, 
  Search, 
  Loader2, 
  Sparkles,
  Copy,
  CheckCircle2,
  Bell,
  AlertCircle,
  Plus,
  Target,
  Swords,
  Globe
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  handle: string | null;
  earned_ap: number;
  vault_ap: number;
  identity_rank: string;
  current_streak?: number;
}

interface FriendItem {
  friendshipId: string;
  profile: Profile;
  todayCompleted?: boolean;
}

interface Arena {
  id: string;
  name: string;
  creator_id: string;
}

// 7-Day Universal Task Deck (General Public & Elementarily Verifiable)
const DAILY_TASKS = [
  { day: 1, title: "10,000 Step Threshold", verification: "Step counter app screenshot" },
  { day: 2, title: "3 Liters Water Protocol", verification: "Timestamped water bottle photo" },
  { day: 3, title: "Digital Sunset (No Scroll)", verification: "Screen time dashboard screenshot" },
  { day: 4, title: "20-Page Read Sprint", verification: "Photo of finished page with handle note" },
  { day: 5, title: "Clean Fuel / Zero Fast Food", verification: "Home-cooked or clean meal photo" },
  { day: 6, title: "15-Minute Mobility Flow", verification: "Fitness tracker workout completion screen" },
  { day: 7, title: "Weekly Execution Blueprint", verification: "Photo of handwritten goals or notes app" },
];

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState<"squad" | "requests" | "add" | "arenas">("squad");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendItem[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [searchHandle, setSearchHandle] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nudgedMap, setNudgedMap] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Arena States
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [newArenaName, setNewArenaName] = useState("");
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null);
  const [arenaMembers, setArenaMembers] = useState<any[]>([]);
  const [bounties, setBounties] = useState<any[]>([]);
  const [bountyTarget, setBountyTarget] = useState("");
  const [bountyWager, setBountyWager] = useState(20);
  const [bountyTask, setBountyTask] = useState("50 Pushups / Timed Video Proof");

  const supabase = createClient();

  useEffect(() => {
    fetchSocialData();
    fetchArenas();
  }, []);

  async function fetchSocialData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch current operator profile (including dual-ledger AP)
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, handle, earned_ap, vault_ap, identity_rank, current_streak")
      .eq("id", user.id)
      .single();

    setMyProfile(profileData);

    // 2. Fetch friendships
    const { data: connections } = await supabase
      .from("friendships")
      .select("id, user_id, friend_id, status")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    const acceptedPairs: { friendshipId: string; profileId: string }[] = [];
    const pendingPairs: { friendshipId: string; profileId: string }[] = [];

    (connections || []).forEach((conn) => {
      if (conn.status === "accepted") {
        const partnerId = conn.user_id === user.id ? conn.friend_id : conn.user_id;
        acceptedPairs.push({ friendshipId: conn.id, profileId: partnerId });
      } else if (conn.status === "pending" && conn.friend_id === user.id) {
        pendingPairs.push({ friendshipId: conn.id, profileId: conn.user_id });
      }
    });

    const allPartnerIds = [...acceptedPairs, ...pendingPairs].map((p) => p.profileId);

    if (allPartnerIds.length > 0) {
      const { data: memberProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, handle, earned_ap, vault_ap, identity_rank, current_streak")
        .in("id", allPartnerIds);

      const profileMap = new Map((memberProfiles || []).map((p) => [p.id, p]));

      const todayDate = new Date().toISOString().split("T")[0];
      const { data: todayLogs } = await supabase
        .from("daily_logs")
        .select("user_id, gym_done, editing_done, meals_logged, workout, deep_work")
        .eq("log_date", todayDate)
        .in("user_id", acceptedPairs.map((p) => p.profileId));

      const logMap = new Map((todayLogs || []).map((l) => [l.user_id, l]));

      const mappedFriends: FriendItem[] = acceptedPairs.map((item) => {
        const profile = profileMap.get(item.profileId) || {
          id: item.profileId,
          full_name: "Operator",
          handle: "operator",
          earned_ap: 0,
          vault_ap: 0,
          identity_rank: "Initiate",
          current_streak: 0,
        };
        const log = logMap.get(item.profileId);
        const isDone = Boolean(
          (log?.gym_done || log?.workout) &&
          (log?.editing_done || log?.deep_work) &&
          (log?.meals_logged || 0) >= 3
        );

        return {
          friendshipId: item.friendshipId,
          profile,
          todayCompleted: isDone,
        };
      });

      const mappedRequests: FriendItem[] = pendingPairs.map((item) => ({
        friendshipId: item.friendshipId,
        profile: profileMap.get(item.profileId) || {
          id: item.profileId,
          full_name: "Operator",
          handle: "operator",
          earned_ap: 0,
          vault_ap: 0,
          identity_rank: "Initiate",
          current_streak: 0,
        },
      }));

      setFriends(mappedFriends);
      setPendingRequests(mappedRequests);
    } else {
      setFriends([]);
      setPendingRequests([]);
    }

    setLoading(false);
  }

  async function fetchArenas() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("arenas")
      .select("id, name, creator_id");
    if (data) setArenas(data);
  }

  async function fetchArenaDetails(arenaId: string) {
    const { data: members } = await supabase
      .from("arena_members")
      .select("user_id, profiles:user_id(id, full_name, handle, vault_ap)")
      .eq("arena_id", arenaId);
    if (members) setArenaMembers(members);

    const { data: activeBounties } = await supabase
      .from("arena_bounties")
      .select("*")
      .eq("arena_id", arenaId);
    if (activeBounties) setBounties(activeBounties);
  }

  function handleCopyInviteLink() {
    const handle = myProfile?.handle || "operator";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/invite/${handle}`;

    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!searchHandle.trim()) return;

    setActionLoading(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const cleanHandle = searchHandle.trim().replace(/^@/, "").toLowerCase();

    if (cleanHandle === (myProfile?.handle || "").toLowerCase()) {
      setMessage({ text: "You cannot add yourself to your squad.", type: "error" });
      setActionLoading(false);
      return;
    }

    const { data: targetProfile, error: searchError } = await supabase
      .from("profiles")
      .select("id, handle")
      .ilike("handle", cleanHandle)
      .maybeSingle();

    if (searchError || !targetProfile) {
      setMessage({ text: `No operator found with handle @${cleanHandle}`, type: "error" });
      setActionLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status")
      .or(`and(user_id.eq.${user.id},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      setMessage({
        text: existing.status === "accepted" ? "Already in your squad." : "Friend request is already pending.",
        type: "error",
      });
      setActionLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("friendships").insert({
      user_id: user.id,
      friend_id: targetProfile.id,
      status: "pending",
    });

    if (insertError) {
      setMessage({ text: `Failed to send request: ${insertError.message}`, type: "error" });
    } else {
      await supabase.from("notifications").insert({
        user_id: targetProfile.id,
        actor_id: user.id,
        type: "squad_request",
        message: `👥 Squad Summons: @${myProfile?.handle || "An operator"} sent you a squad invitation.`,
        is_read: false,
      });

      setMessage({ text: `Request sent to @${cleanHandle}!`, type: "success" });
      setSearchHandle("");
    }
    setActionLoading(false);
  }

  async function handleRespondRequest(friendshipId: string, senderId: string, accept: boolean) {
    setActionLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (accept) {
      await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);

      if (user) {
        await supabase.from("notifications").insert({
          user_id: senderId,
          actor_id: user.id,
          type: "squad_accepted",
          message: `🤝 Squad Formed: @${myProfile?.handle || "Operator"} accepted your invitation.`,
          is_read: false,
        });
      }
    } else {
      await supabase.from("friendships").delete().eq("id", friendshipId);
    }

    await fetchSocialData();
    setActionLoading(false);
  }

  async function handleCreateArena(e: React.FormEvent) {
    e.preventDefault();
    if (!newArenaName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("arenas")
      .insert({ name: newArenaName.trim(), creator_id: user.id })
      .select()
      .single();

    if (!error && data) {
      // Automatically add creator to arena members
      await supabase.from("arena_members").insert({ arena_id: data.id, user_id: user.id });
      setNewArenaName("");
      fetchArenas();
    }
  }

  async function handleIssueBounty(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedArena || !bountyTarget) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user has enough vault AP
    if ((myProfile?.vault_ap || 0) < bountyWager) {
      alert("Insufficient Vault AP for this wager.");
      return;
    }

    // Escrow: Deduct vault AP from challenger
    await supabase
      .from("profiles")
      .update({ vault_ap: (myProfile?.vault_ap || 0) - bountyWager })
      .eq("id", user.id);

    // Create bounty
    await supabase.from("arena_bounties").insert({
      arena_id: selectedArena.id,
      challenger_id: user.id,
      target_id: bountyTarget,
      task_title: bountyTask,
      ap_stake: bountyWager,
      status: "pending_acceptance",
    });

    fetchArenaDetails(selectedArena.id);
    alert("Bounty deployed successfully into escrow!");
  }

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Operator Squad</h1>
          <p className="text-zinc-500 text-sm font-medium">Peer Accountability & Arenas</p>
        </div>

        <button
          onClick={handleCopyInviteLink}
          className="p-2.5 px-3.5 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
          <span>{copied ? "Copied!" : "Invite Link"}</span>
        </button>
      </div>

      {/* Vault AP Banner (Dual-Ledger Isolation) */}
      <div className="liquid-glass rounded-2xl p-4 border border-white/80 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white flex items-center justify-between shadow-md">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">P2P Arena Vault Balance</p>
          <p className="text-lg font-black text-emerald-400">{myProfile?.vault_ap || 0} Vault AP</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Global Rank Power</p>
          <p className="text-lg font-black text-amber-400">{myProfile?.earned_ap || 0} Earned AP</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="liquid-glass rounded-2xl p-1.5 flex gap-1 border border-white/80 shadow-sm bg-zinc-200/50 backdrop-blur-md">
        <button
          onClick={() => setActiveTab("squad")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "squad" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          Squad ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab("arenas")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "arenas" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          Arenas
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === "requests" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          Requests
          {pendingRequests.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500 text-white font-bold">
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("add")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "add" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          Add
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="pt-16 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <p className="text-xs text-zinc-400 font-medium">Syncing Squad Data...</p>
        </div>
      ) : (
        <>
          {/* Tab 1: Squad List */}
          {activeTab === "squad" && (
            <div className="space-y-3">
              {friends.length > 0 ? (
                friends.map(({ friendshipId, profile, todayCompleted }) => {
                  const displayName = profile?.full_name || (profile?.handle ? `@${profile.handle}` : "Operator");
                  return (
                    <div key={friendshipId} className="liquid-glass rounded-3xl p-4 border border-white/80 shadow-sm flex items-center justify-between bg-white/70">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                          {displayName.replace(/^@/, "").charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{displayName}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-semibold text-zinc-500">
                            <span className="text-orange-600 flex items-center gap-0.5">
                              <Flame className="w-3 h-3 text-orange-500 fill-orange-500" /> {profile?.current_streak || 0}d
                            </span>
                            <span>•</span>
                            <span className="text-emerald-600">{profile?.earned_ap || 0} AP</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        {todayCompleted ? (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-800 text-[10px] font-bold">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="liquid-glass p-8 rounded-3xl text-center space-y-3 bg-white/60">
                  <Users className="w-8 h-8 text-zinc-300 mx-auto" />
                  <p className="text-sm font-bold text-zinc-800">Squad is Empty</p>
                  <button onClick={handleCopyInviteLink} className="px-4 py-2 rounded-2xl bg-zinc-900 text-white text-xs font-bold">
                    Copy Invite Link
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Custom Arenas & Bounties */}
          {activeTab === "arenas" && (
            <div className="space-y-4">
              {!selectedArena ? (
                <div className="space-y-4">
                  <form onSubmit={handleCreateArena} className="liquid-glass p-4 rounded-3xl space-y-3 bg-white/70 border">
                    <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Create Private Arena</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Arena Name (e.g. Alpha Elite)"
                        value={newArenaName}
                        onChange={(e) => setNewArenaName(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-white border text-xs outline-none"
                      />
                      <button type="submit" className="px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-xl">
                        Create
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase px-1">Your Arenas</h3>
                    {arenas.map((arena) => (
                      <div
                        key={arena.id}
                        onClick={() => { setSelectedArena(arena); fetchArenaDetails(arena.id); }}
                        className="liquid-glass p-4 rounded-2xl bg-white/70 border flex items-center justify-between cursor-pointer hover:border-emerald-500"
                      >
                        <span className="text-sm font-bold text-zinc-900">{arena.name}</span>
                        <Swords className="w-4 h-4 text-emerald-600" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <button onClick={() => setSelectedArena(null)} className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    ← Back to Arenas
                  </button>
                  <div className="liquid-glass p-4 rounded-3xl bg-zinc-900 text-white space-y-2">
                    <h2 className="text-lg font-black">{selectedArena.name}</h2>
                    <p className="text-xs text-zinc-400">War Room & Zero-Sum Escrow Bounties</p>
                  </div>

                  {/* Daily Task Card Deck */}
                  <div className="liquid-glass p-4 rounded-3xl bg-white/70 border space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">Today's Arena Task Card</h3>
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                      <p className="text-sm font-bold text-zinc-900">{DAILY_TASKS[0].title}</p>
                      <p className="text-[11px] text-zinc-500">Verification: {DAILY_TASKS[0].verification}</p>
                    </div>
                  </div>

                  {/* Issue Zero-Sum Bounty */}
                  <form onSubmit={handleIssueBounty} className="liquid-glass p-4 rounded-3xl bg-white/70 border space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800">Issue P2P Bounty (Vault AP Wager)</h3>
                    <select
                      value={bountyTarget}
                      onChange={(e) => setBountyTarget(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border text-xs"
                    >
                      <option value="">Select Target Friend</option>
                      {friends.map((f) => (
                        <option key={f.profile.id} value={f.profile.id}>{f.profile.full_name || f.profile.handle}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Wager Vault AP (e.g. 20)"
                      value={bountyWager}
                      onChange={(e) => setBountyWager(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white border text-xs"
                    />
                    <button type="submit" className="w-full py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl">
                      Deploy Bounty in Escrow
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Requests */}
          {activeTab === "requests" && (
            <div className="space-y-3">
              {pendingRequests.map(({ friendshipId, profile }) => (
                <div key={friendshipId} className="liquid-glass rounded-3xl p-4 border flex items-center justify-between bg-white/70">
                  <p className="text-sm font-bold">@{profile?.handle}</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleRespondRequest(friendshipId, profile.id, true)} className="p-2 bg-emerald-500 text-white rounded-xl">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleRespondRequest(friendshipId, profile.id, false)} className="p-2 bg-zinc-200 text-zinc-600 rounded-xl">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 4: Add Friend */}
          {activeTab === "add" && (
            <form onSubmit={handleSendRequest} className="space-y-3 liquid-glass p-6 rounded-3xl bg-white/70 border">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Manual Handle Lookup</p>
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-3" />
                <input
                  type="text"
                  placeholder="operator_handle"
                  value={searchHandle}
                  onChange={(e) => setSearchHandle(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border text-xs"
                />
              </div>
              <button type="submit" disabled={actionLoading} className="w-full py-2.5 bg-zinc-900 text-white font-bold text-xs rounded-xl">
                Send Squad Invite
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

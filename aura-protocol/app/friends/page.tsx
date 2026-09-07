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
  ArrowRight,
  Share2,
  Copy,
  CheckCircle2,
  Bell,
  Send,
  AlertCircle
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  handle: string | null;
  aura_points: number;
  identity_rank: string;
  current_streak?: number;
}

interface FriendItem {
  friendshipId: string;
  profile: Profile;
  todayCompleted?: boolean;
}

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState<"squad" | "requests" | "add">("squad");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendItem[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [searchHandle, setSearchHandle] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nudgedMap, setNudgedMap] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchSocialData();
  }, []);

  async function fetchSocialData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch current operator profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, handle, aura_points, identity_rank, current_streak")
      .eq("id", user.id)
      .single();

    setMyProfile(profileData);

    // 2. Fetch all friendships involving current operator
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
      // 3. Batch resolve member profiles
      const { data: memberProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, handle, aura_points, identity_rank, current_streak")
        .in("id", allPartnerIds);

      const profileMap = new Map((memberProfiles || []).map((p) => [p.id, p]));

      // 4. Batch resolve today's gauntlet completion for squadmates
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
          aura_points: 0,
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
          aura_points: 0,
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

    // 1. Locate target profile
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

    // 2. Check for existing friendship
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

    // 3. Insert friendship request
    const { error: insertError } = await supabase.from("friendships").insert({
      user_id: user.id,
      friend_id: targetProfile.id,
      status: "pending",
    });

    if (insertError) {
      setMessage({ text: `Failed to send request: ${insertError.message}`, type: "error" });
    } else {
      // 4. Dispatch notification signal
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
          message: `🤝 Squad Formed: @${myProfile?.handle || "Operator"} accepted your invitation. Your arenas are now linked.`,
          is_read: false,
        });
      }
    } else {
      await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);
    }

    await fetchSocialData();
    setActionLoading(false);
  }

  async function handleNudge(memberId: string) {
    if (nudgedMap[memberId]) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("notifications").insert({
      user_id: memberId,
      actor_id: user.id,
      type: "nudge",
      message: `⚡ Accountability Ping: @${myProfile?.handle || "Your squadmate"} is tracking today's gauntlet. Verify your disciplines!`,
      is_read: false,
    });

    setNudgedMap((prev) => ({ ...prev, [memberId]: true }));
  }

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Title Header with Copy Invite Link Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Operator Squad</h1>
          <p className="text-zinc-500 text-sm font-medium">Peer Accountability & Social Sync</p>
        </div>

        <button
          onClick={handleCopyInviteLink}
          className="p-2.5 px-3.5 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          title="Copy Personal Squad Invite Link"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Invite Link</span>
            </>
          )}
        </button>
      </div>

      {/* Glass Navigation Tabs */}
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
          onClick={() => setActiveTab("requests")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === "requests" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          Requests
          {pendingRequests.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500 text-white font-bold">
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
          Add Friend
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
                  const isNudged = !!nudgedMap[profile.id];

                  return (
                    <div
                      key={friendshipId}
                      className="liquid-glass rounded-3xl p-4 border border-white/80 shadow-sm flex items-center justify-between backdrop-blur-xl bg-white/70"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                          {displayName.replace(/^@/, "").charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-zinc-900">{displayName}</p>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                              {profile?.identity_rank || "Initiate"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-semibold text-zinc-500">
                            <span className="flex items-center gap-0.5 text-orange-600">
                              <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                              {profile?.current_streak || 0}d
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-emerald-600">
                              <Sparkles className="w-3 h-3" />
                              {profile?.aura_points || 0} AP
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Check / Nudge Action */}
                      <div className="flex items-center gap-2">
                        {todayCompleted ? (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Done</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleNudge(profile.id)}
                            disabled={isNudged}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              isNudged
                                ? "bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed"
                                : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-500/30 active:scale-95"
                            }`}
                          >
                            <Bell className="w-3 h-3 text-amber-600" />
                            <span>{isNudged ? "Pinged" : "Nudge"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="liquid-glass p-8 rounded-3xl text-center space-y-4 border border-white/80 bg-white/60">
                  <Users className="w-8 h-8 text-zinc-300 mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-zinc-800">Squad is Empty</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                      Accountability increases by 85% when you train with peers. Share your personal invite link to sync streaks and challenge the arena.
                    </p>
                  </div>
                  <button
                    onClick={handleCopyInviteLink}
                    className="px-4 py-2.5 rounded-2xl bg-zinc-900 text-white text-xs font-bold shadow-md hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Link Copied!" : "Copy Squad Invite Link"}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Incoming Requests */}
          {activeTab === "requests" && (
            <div className="space-y-3">
              {pendingRequests.length > 0 ? (
                pendingRequests.map(({ friendshipId, profile }) => (
                  <div
                    key={friendshipId}
                    className="liquid-glass rounded-3xl p-4 border border-white/80 shadow-sm flex items-center justify-between backdrop-blur-xl bg-white/70"
                  >
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{profile?.full_name || profile?.handle}</p>
                      <p className="text-[11px] text-zinc-400 font-medium">@{profile?.handle || "operator"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRespondRequest(friendshipId, profile.id, true)}
                        disabled={actionLoading}
                        className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        title="Accept"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRespondRequest(friendshipId, profile.id, false)}
                        disabled={actionLoading}
                        className="p-2 rounded-xl bg-zinc-100 text-zinc-500 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer disabled:opacity-50"
                        title="Decline"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="liquid-glass p-8 rounded-3xl text-center space-y-2 border border-white/80 bg-white/60">
                  <p className="text-sm font-bold text-zinc-700">No pending requests</p>
                  <p className="text-xs text-zinc-400">Incoming squad invites will appear here.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Search & Add Friend */}
          {activeTab === "add" && (
            <div className="space-y-4">
              {/* Viral Referral Pass Banner */}
              <div className="liquid-glass rounded-3xl p-5 border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">
                    Viral Invite Pass
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700">
                    7-Day Pass Included
                  </span>
                </div>
                <p className="text-xs font-medium text-zinc-600 leading-relaxed">
                  Send your personal invite link. When friends accept, they bypass manual requests and immediately sync to your squad.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${myProfile?.handle || "operator"}`}
                    className="flex-1 bg-white/80 border border-emerald-500/20 rounded-xl px-3 py-2 text-[11px] font-mono text-zinc-600 outline-none select-all"
                  />
                  <button
                    onClick={handleCopyInviteLink}
                    className="px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* Search by Handle Form */}
              <form onSubmit={handleSendRequest} className="space-y-3 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                  Manual Handle Lookup
                </p>
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    placeholder="Enter handle (e.g. rahul_99)"
                    value={searchHandle}
                    onChange={(e) => setSearchHandle(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/80 border border-zinc-200 text-xs font-semibold placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading || !searchHandle.trim()}
                  className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Squad Invite"}
                </button>
              </form>

              {message && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold border flex items-center gap-2 ${
                    message.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-rose-50 border-rose-200 text-rose-600"
                  }`}
                >
                  {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}// app/friends/page.tsx
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
  ArrowRight,
  Share2,
  Copy,
  CheckCircle2,
  Bell,
  Send,
  AlertCircle
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  handle: string | null;
  aura_points: number;
  identity_rank: string;
  current_streak?: number;
}

interface FriendItem {
  friendshipId: string;
  profile: Profile;
  todayCompleted?: boolean;
}

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState<"squad" | "requests" | "add">("squad");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendItem[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [searchHandle, setSearchHandle] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nudgedMap, setNudgedMap] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchSocialData();
  }, []);

  async function fetchSocialData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch current operator profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, handle, aura_points, identity_rank, current_streak")
      .eq("id", user.id)
      .single();

    setMyProfile(profileData);

    // 2. Fetch all friendships involving current operator
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
      // 3. Batch resolve member profiles
      const { data: memberProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, handle, aura_points, identity_rank, current_streak")
        .in("id", allPartnerIds);

      const profileMap = new Map((memberProfiles || []).map((p) => [p.id, p]));

      // 4. Batch resolve today's gauntlet completion for squadmates
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
          aura_points: 0,
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
          aura_points: 0,
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

    // 1. Locate target profile
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

    // 2. Check for existing friendship
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

    // 3. Insert friendship request
    const { error: insertError } = await supabase.from("friendships").insert({
      user_id: user.id,
      friend_id: targetProfile.id,
      status: "pending",
    });

    if (insertError) {
      setMessage({ text: `Failed to send request: ${insertError.message}`, type: "error" });
    } else {
      // 4. Dispatch notification signal
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
          message: `🤝 Squad Formed: @${myProfile?.handle || "Operator"} accepted your invitation. Your arenas are now linked.`,
          is_read: false,
        });
      }
    } else {
      await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);
    }

    await fetchSocialData();
    setActionLoading(false);
  }

  async function handleNudge(memberId: string) {
    if (nudgedMap[memberId]) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("notifications").insert({
      user_id: memberId,
      actor_id: user.id,
      type: "nudge",
      message: `⚡ Accountability Ping: @${myProfile?.handle || "Your squadmate"} is tracking today's gauntlet. Verify your disciplines!`,
      is_read: false,
    });

    setNudgedMap((prev) => ({ ...prev, [memberId]: true }));
  }

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Title Header with Copy Invite Link Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Operator Squad</h1>
          <p className="text-zinc-500 text-sm font-medium">Peer Accountability & Social Sync</p>
        </div>

        <button
          onClick={handleCopyInviteLink}
          className="p-2.5 px-3.5 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          title="Copy Personal Squad Invite Link"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Invite Link</span>
            </>
          )}
        </button>
      </div>

      {/* Glass Navigation Tabs */}
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
          onClick={() => setActiveTab("requests")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === "requests" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          Requests
          {pendingRequests.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500 text-white font-bold">
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
          Add Friend
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
                  const isNudged = !!nudgedMap[profile.id];

                  return (
                    <div
                      key={friendshipId}
                      className="liquid-glass rounded-3xl p-4 border border-white/80 shadow-sm flex items-center justify-between backdrop-blur-xl bg-white/70"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                          {displayName.replace(/^@/, "").charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-zinc-900">{displayName}</p>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                              {profile?.identity_rank || "Initiate"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-semibold text-zinc-500">
                            <span className="flex items-center gap-0.5 text-orange-600">
                              <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                              {profile?.current_streak || 0}d
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-emerald-600">
                              <Sparkles className="w-3 h-3" />
                              {profile?.aura_points || 0} AP
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Check / Nudge Action */}
                      <div className="flex items-center gap-2">
                        {todayCompleted ? (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Done</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleNudge(profile.id)}
                            disabled={isNudged}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                              isNudged
                                ? "bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed"
                                : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-500/30 active:scale-95"
                            }`}
                          >
                            <Bell className="w-3 h-3 text-amber-600" />
                            <span>{isNudged ? "Pinged" : "Nudge"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="liquid-glass p-8 rounded-3xl text-center space-y-4 border border-white/80 bg-white/60">
                  <Users className="w-8 h-8 text-zinc-300 mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-zinc-800">Squad is Empty</p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                      Accountability increases by 85% when you train with peers. Share your personal invite link to sync streaks and challenge the arena.
                    </p>
                  </div>
                  <button
                    onClick={handleCopyInviteLink}
                    className="px-4 py-2.5 rounded-2xl bg-zinc-900 text-white text-xs font-bold shadow-md hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Link Copied!" : "Copy Squad Invite Link"}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Incoming Requests */}
          {activeTab === "requests" && (
            <div className="space-y-3">
              {pendingRequests.length > 0 ? (
                pendingRequests.map(({ friendshipId, profile }) => (
                  <div
                    key={friendshipId}
                    className="liquid-glass rounded-3xl p-4 border border-white/80 shadow-sm flex items-center justify-between backdrop-blur-xl bg-white/70"
                  >
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{profile?.full_name || profile?.handle}</p>
                      <p className="text-[11px] text-zinc-400 font-medium">@{profile?.handle || "operator"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRespondRequest(friendshipId, profile.id, true)}
                        disabled={actionLoading}
                        className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        title="Accept"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRespondRequest(friendshipId, profile.id, false)}
                        disabled={actionLoading}
                        className="p-2 rounded-xl bg-zinc-100 text-zinc-500 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer disabled:opacity-50"
                        title="Decline"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="liquid-glass p-8 rounded-3xl text-center space-y-2 border border-white/80 bg-white/60">
                  <p className="text-sm font-bold text-zinc-700">No pending requests</p>
                  <p className="text-xs text-zinc-400">Incoming squad invites will appear here.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Search & Add Friend */}
          {activeTab === "add" && (
            <div className="space-y-4">
              {/* Viral Referral Pass Banner */}
              <div className="liquid-glass rounded-3xl p-5 border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">
                    Viral Invite Pass
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700">
                    7-Day Pass Included
                  </span>
                </div>
                <p className="text-xs font-medium text-zinc-600 leading-relaxed">
                  Send your personal invite link. When friends accept, they bypass manual requests and immediately sync to your squad.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${myProfile?.handle || "operator"}`}
                    className="flex-1 bg-white/80 border border-emerald-500/20 rounded-xl px-3 py-2 text-[11px] font-mono text-zinc-600 outline-none select-all"
                  />
                  <button
                    onClick={handleCopyInviteLink}
                    className="px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* Search by Handle Form */}
              <form onSubmit={handleSendRequest} className="space-y-3 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                  Manual Handle Lookup
                </p>
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    placeholder="Enter handle (e.g. rahul_99)"
                    value={searchHandle}
                    onChange={(e) => setSearchHandle(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/80 border border-zinc-200 text-xs font-semibold placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading || !searchHandle.trim()}
                  className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Squad Invite"}
                </button>
              </form>

              {message && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold border flex items-center gap-2 ${
                    message.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-rose-50 border-rose-200 text-rose-600"
                  }`}
                >
                  {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

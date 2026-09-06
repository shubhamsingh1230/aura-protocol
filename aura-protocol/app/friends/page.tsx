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
  ArrowRight
} from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  handle: string | null;
  aura_points: number;
  identity_rank: string;
}

interface FriendItem {
  friendshipId: string;
  profile: Profile;
}

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState<"squad" | "requests" | "add">("squad");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendItem[]>([]);
  const [searchHandle, setSearchHandle] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchSocialData();
  }, []);

  async function fetchSocialData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch accepted friendships where current user is either sender or receiver
    const { data: acceptedRows } = await supabase
      .from("friendships")
      .select(`
        id,
        user_id,
        friend_id,
        status,
        sender:profiles!friendships_user_id_fkey(id, full_name, handle, aura_points, identity_rank),
        receiver:profiles!friendships_friend_id_fkey(id, full_name, handle, aura_points, identity_rank)
      `)
      .eq("status", "accepted")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    // Map to list of friend profiles
    const mappedFriends: FriendItem[] = (acceptedRows || []).map((row: any) => {
      const friendProfile = row.user_id === user.id ? row.receiver : row.sender;
      return {
        friendshipId: row.id,
        profile: friendProfile,
      };
    });
    setFriends(mappedFriends);

    // Fetch pending requests sent TO the current user
    const { data: requestRows } = await supabase
      .from("friendships")
      .select(`
        id,
        sender:profiles!friendships_user_id_fkey(id, full_name, handle, aura_points, identity_rank)
      `)
      .eq("friend_id", user.id)
      .eq("status", "pending");

    const mappedRequests: FriendItem[] = (requestRows || []).map((row: any) => ({
      friendshipId: row.id,
      profile: row.sender,
    }));
    setPendingRequests(mappedRequests);

    setLoading(false);
  }

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!searchHandle.trim()) return;

    setActionLoading(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const cleanHandle = searchHandle.trim().replace(/^@/, "");

    // 1. Locate target profile
    const { data: targetProfile, error: searchError } = await supabase
      .from("profiles")
      .select("id, handle")
      .ilike("handle", cleanHandle)
      .single();

    if (searchError || !targetProfile) {
      setMessage({ text: `No operator found with handle @${cleanHandle}`, type: "error" });
      setActionLoading(false);
      return;
    }

    if (targetProfile.id === user.id) {
      setMessage({ text: "You cannot add yourself to your squad.", type: "error" });
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
      setMessage({ text: `Request sent to @${cleanHandle}!`, type: "success" });
      setSearchHandle("");
    }
    setActionLoading(false);
  }

  async function handleRespondRequest(friendshipId: string, accept: boolean) {
    setActionLoading(true);
    if (accept) {
      await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);
    } else {
      await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);
    }
    await fetchSocialData();
    setActionLoading(false);
  }

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Operator Squad</h1>
        <p className="text-zinc-500 text-sm font-medium">Peer Accountability & Social Sync</p>
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
                friends.map(({ friendshipId, profile }) => {
                  const displayName = profile?.full_name || profile?.handle || "Operator";
                  return (
                    <div
                      key={friendshipId}
                      className="liquid-glass rounded-3xl p-4 border border-white/80 shadow-sm flex items-center justify-between backdrop-blur-xl bg-white/70"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                          {displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{displayName}</p>
                          <p className="text-[11px] text-zinc-400 font-medium">
                            @{profile?.handle || "operator"} • {profile?.identity_rank || "Initiate"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-emerald-600 font-extrabold text-xs">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{profile?.aura_points || 0} AP</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-medium">Active Member</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="liquid-glass p-8 rounded-3xl text-center space-y-3 border border-white/80 bg-white/60">
                  <Users className="w-8 h-8 text-zinc-300 mx-auto" />
                  <p className="text-sm font-bold text-zinc-700">Squad is empty</p>
                  <p className="text-xs text-zinc-400">Add friends using their operator handle to track collective progress.</p>
                  <button
                    onClick={() => setActiveTab("add")}
                    className="mt-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold shadow-md hover:bg-zinc-800 transition-all"
                  >
                    Find Operators
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
                        onClick={() => handleRespondRequest(friendshipId, true)}
                        disabled={actionLoading}
                        className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-sm"
                        title="Accept"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRespondRequest(friendshipId, false)}
                        disabled={actionLoading}
                        className="p-2 rounded-xl bg-zinc-100 text-zinc-500 hover:bg-red-50 hover:text-red-500 transition-all"
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
              <form onSubmit={handleSendRequest} className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-3.5" />
                  <input
                    type="text"
                    placeholder="Enter handle (e.g. rahul_99)"
                    value={searchHandle}
                    onChange={(e) => setSearchHandle(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/80 border border-zinc-200 text-xs font-semibold placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading || !searchHandle.trim()}
                  className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Squad Invite"}
                </button>
              </form>

              {message && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold border ${
                    message.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-red-50 border-red-200 text-red-600"
                  }`}
                >
                  {message.text}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// app/notifications/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Bell, 
  Flame, 
  Shield, 
  Award, 
  Users, 
  Check, 
  CheckCheck, 
  Loader2, 
  Clock,
  Sparkles
} from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  actor_id: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setNotifications(data || []);
    setLoading(false);
  }

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  }

  async function markAllAsRead() {
    setMarkingAll(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
    setMarkingAll(false);
  }

  function getNotificationBadge(type: string) {
    switch (type) {
      case "streak_milestone":
        return {
          icon: Flame,
          color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
          title: "Streak Milestone",
        };
      case "shield_deployed":
        return {
          icon: Shield,
          color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
          title: "Shield Activated",
        };
      case "rank_up":
        return {
          icon: Award,
          color: "text-purple-600 bg-purple-500/10 border-purple-500/20",
          title: "Rank Elevation",
        };
      case "friend_request":
        return {
          icon: Users,
          color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
          title: "Squad Ping",
        };
      default:
        return {
          icon: Sparkles,
          color: "text-zinc-600 bg-zinc-100 border-zinc-200",
          title: "Protocol Signal",
        };
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="pt-10 px-4 pb-32 min-h-screen space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Signals</h1>
          <p className="text-zinc-500 text-sm font-medium">Protocol Milestones & Transmissions</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="p-2.5 rounded-2xl bg-white/80 hover:bg-white text-zinc-700 border border-zinc-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Mark all as read"
          >
            {markingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Clear Unread</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main List */}
      {loading ? (
        <div className="pt-24 text-center flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <p className="text-xs text-zinc-400 font-medium">Fetching Protocol Feed...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="liquid-glass p-8 rounded-3xl text-center space-y-2 border border-white/80 bg-white/60">
          <Bell className="w-8 h-8 text-zinc-300 mx-auto" />
          <p className="text-sm font-bold text-zinc-700">No active signals</p>
          <p className="text-xs text-zinc-400">
            Milestones, streak freeze protections, and rank elevations will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => {
            const badge = getNotificationBadge(item.type);
            const Icon = badge.icon;
            const timeAgo = new Date(item.created_at).toLocaleDateString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={item.id}
                onClick={() => !item.is_read && markAsRead(item.id)}
                className={`liquid-glass rounded-3xl p-4 border transition-all flex items-start gap-3.5 backdrop-blur-xl cursor-pointer ${
                  item.is_read
                    ? "bg-white/60 border-white/80 opacity-80"
                    : "bg-white/90 border-emerald-500/40 shadow-sm"
                }`}
              >
                {/* Visual Icon Pin */}
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${badge.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content Payload */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {badge.title}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap">
                      {timeAgo}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-zinc-800 leading-snug">
                    {item.message}
                  </p>
                </div>

                {/* Read/Unread Dot */}
                {!item.is_read && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

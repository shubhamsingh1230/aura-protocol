// components/dashboard/CommandHeader.tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { LogOut, Shield, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

interface CommandHeaderProps {
  displayName: string;
  handle: string;
  identityRank: string;
}

export default function CommandHeader({ displayName, handle, identityRank }: CommandHeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex items-center justify-between w-full px-1 pt-4 pb-2">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black tracking-tight text-zinc-900">
            Hi, {displayName || "Operator"} 👋
          </h1>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
            {identityRank || "Initiate"}
          </span>
        </div>
        <p className="text-xs text-zinc-500 font-medium">@{handle || "operator"}</p>
      </div>

      <button
        onClick={handleSignOut}
        className="px-3 py-2 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-rose-600 transition-all text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
        title="Sign Out of Protocol"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Sign Out</span>
      </button>
    </div>
  );
}

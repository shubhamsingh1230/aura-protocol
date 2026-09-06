"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Timer, Flame, Trophy } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Time", href: "/time", icon: Timer },
    { name: "Feed", href: "/feed", icon: Flame },
    { name: "Ranks", href: "/leaderboard", icon: Trophy },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4">
      <nav className="liquid-glass rounded-full px-3 py-2 flex items-center gap-1 shadow-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full transition-all duration-300 ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-inner"
                  : "text-zinc-500 hover:text-zinc-800 hover:bg-black/[0.03]"
              }`}
            >
              <Icon className={`w-[18px] h-[18px] ${isActive ? "text-emerald-600" : "text-zinc-500"}`} />
              <span className="text-[11px] font-semibold tracking-wide uppercase">{tab.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

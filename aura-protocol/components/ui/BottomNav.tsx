"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Flame, Trophy } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Feed", href: "/feed", icon: Flame },
    { name: "Ranks", href: "/leaderboard", icon: Trophy },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4">
      <nav className="liquid-glass rounded-full px-4 py-2.5 flex items-center gap-2 shadow-2xl backdrop-blur-3xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                isActive
                  ? "bg-white/[0.12] text-emerald-400 border border-white/[0.15] shadow-inner"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
              <span className="text-xs font-medium tracking-wide">{tab.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

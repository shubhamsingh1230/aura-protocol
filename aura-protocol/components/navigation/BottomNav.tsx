// components/navigation/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Trophy, 
  ShoppingBag, 
  Users, 
  User, 
  Activity
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Console", icon: LayoutDashboard },
  { href: "/leaderboard", label: "Arena", icon: Trophy },
  { href: "/friends", label: "Squad", icon: Users },
  { href: "/store", label: "Market", icon: ShoppingBag },
  { href: "/autopsy", label: "Autopsy", icon: Activity },
  { href: "/profile", label: "Dossier", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide bottom dock on public or checkout paywall screens
  const isExcluded = pathname.startsWith("/login") || 
                     pathname.startsWith("/checkout") || 
                     pathname.startsWith("/auth");

  if (isExcluded) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="liquid-glass rounded-3xl px-3 py-2 border border-white/80 shadow-2xl backdrop-blur-2xl bg-white/80 flex items-center gap-1 sm:gap-2 pointer-events-auto max-w-md w-full justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl transition-all duration-200 ${
                isActive
                  ? "bg-zinc-900 text-white shadow-md scale-105"
                  : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] font-bold mt-0.5 tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

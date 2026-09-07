// components/navigation/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Trophy, 
  Users, 
  ShoppingBag, 
  Activity, 
  User 
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Console", icon: LayoutDashboard },
  { href: "/arena", label: "Arena", icon: Trophy },
  { href: "/friends", label: "Squad", icon: Users },
  { href: "/store", label: "Market", icon: ShoppingBag },
  { href: "/autopsy", label: "Autopsy", icon: Activity },
  { href: "/profile", label: "Dossier", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Exclude dock on the root landing page, auth, onboarding, etc.
  const isExcluded = 
    pathname === "/" || // <--- ADDED THIS LINE TO HIDE ON ROOT LOGIN PAGE
    pathname.startsWith("/login") || 
    pathname.startsWith("/auth") || 
    pathname.startsWith("/onboarding") || 
    pathname.startsWith("/invite") || 
    pathname.startsWith("/checkout");

  if (isExcluded) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-3 pointer-events-none">
      <nav className="liquid-glass rounded-3xl p-1.5 border border-white/80 shadow-2xl backdrop-blur-2xl bg-white/80 flex items-center gap-1 pointer-events-auto max-w-md w-full justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? "bg-zinc-900 text-white shadow-md font-bold"
                  : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100/60 font-semibold"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : ""}`} />
              <span className="text-[9px] mt-0.5 tracking-tight leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

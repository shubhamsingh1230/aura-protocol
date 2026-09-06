"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: "🏠" },
  { label: "Feed", href: "/feed", icon: "🔥" },
  { label: "Ranks", href: "/leaderboard", icon: "👑" },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const handleNavClick = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 px-4 pointer-events-none">
      <div className="w-full max-w-md glass border border-white/10 rounded-2xl px-6 py-3 flex justify-between items-center pointer-events-auto shadow-2xl backdrop-blur-xl">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <button
              key={item.href}
              onClick={() => handleNavClick(item.href)}
              className={clsx(
                // active:scale-90 mimics the Framer Motion tap instantly without JS overhead
                "flex flex-col items-center gap-1 text-xs transition-all duration-100 ease-out relative py-1 px-3 rounded-xl active:scale-90",
                isActive ? "text-mint font-semibold bg-white/5" : "text-grey-text hover:text-white"
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="tracking-wide text-[11px]">{item.label}</span>
              
              {isActive && (
                <span className="absolute -bottom-1 w-1 h-1 bg-mint rounded-full shadow-glow" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

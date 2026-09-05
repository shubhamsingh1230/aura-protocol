"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { href: "/dashboard", label: "Check-in", glyph: "◎" },
  { href: "/feed", label: "Feed", glyph: "▦" },
  { href: "/leaderboard", label: "Ranks", glyph: "▲" },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/onboarding" || pathname === "/") return null;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-4 z-50">
      <div className="glass rounded-card flex items-center justify-around py-2.5">
        {TABS.map((tab) => {
          const active = pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "flex flex-col items-center gap-1 px-5 py-1.5 rounded-pill transition-colors",
                active ? "text-mint" : "text-grey-text"
              )}
            >
              <span className="text-lg leading-none">{tab.glyph}</span>
              <span className="text-[11px] tracking-wide">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

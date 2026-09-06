"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
  const [mounted, setMounted] = useState(false);

  // Ensures Framer Motion and nav elements only render on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Renders nothing on the server, avoiding any hydration mismatch
  }

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
            <motion.button
              key={item.href}
              whileTap={{ scale: 0.85 }}
              transition={{ duration: 0.05, ease: "easeOut" }}
              onClick={() => handleNavClick(item.href)}
              className={clsx(
                "flex flex-col items-center gap-1 text-xs transition-colors relative py-1 px-3 rounded-xl",
                isActive ? "text-mint font-semibold bg-white/5" : "text-grey-text hover:text-white"
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="tracking-wide text-[11px]">{item.label}</span>
              
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-mint rounded-full shadow-glow" />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

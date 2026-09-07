// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/navigation/BottomNav"; // <-- 1. Import BottomNav

export const metadata: Metadata = {
  title: "The Aura Protocol",
  description: "Gamified social productivity platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen selection:bg-emerald-500 selection:text-black">
        {/* Main page content */}
        {children}
        
        {/* 2. Render BottomNav globally so the Squad, Arena, and Dossier tabs are always visible */}
        <BottomNav />
      </body>
    </html>
  );
}

// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/navigation/BottomNav";

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
      {/* Removed the Tailwind background classes so globals.css can take over */}
      <body className="text-zinc-900 min-h-screen selection:bg-emerald-500 selection:text-white">
        {/* Main page content */}
        {children}
        
        {/* Bottom navigation dock */}
        <BottomNav />
      </body>
    </html>
  );
}

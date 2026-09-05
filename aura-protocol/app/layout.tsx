import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/ui/BottomNav";

export const metadata: Metadata = {
  title: "THE AURA PROTOCOL",
  description: "Stake ₹100. Show up for 7 pillars a day. Own the leaderboard.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-canvas text-white min-h-screen pb-24">
        <div className="mx-auto w-full max-w-md min-h-screen relative">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}

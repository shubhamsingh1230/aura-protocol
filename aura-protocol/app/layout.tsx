import "./globals.css"; // Make sure this points to your Tailwind CSS file
import BottomNav from "@/components/BottomNav"; // Adjust this path to wherever you saved BottomNav.tsx

export const metadata = {
  title: "The Aura Protocol",
  description: "Stake ₹100. Show up. Run the leaderboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-black text-white min-h-screen pb-24" suppressHydrationWarning>
        
        {/* 1. This is where your pages (like Login and Home) actually load */}
        <div className="mx-auto w-full max-w-md min-h-screen relative">
          {children}
        </div>

        {/* 2. The BottomNav sits here, safely inside the body */}
        <BottomNav />
        
      </body>
    </html>
  );
}

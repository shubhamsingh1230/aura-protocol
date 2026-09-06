import "./globals.css"; 
// ✅ FIXED: Pointing exactly to the ui folder you specified
import BottomNav from "@/components/ui/BottomNav"; 

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
        
        {/* Your pages (like Login and Home) load here safely inside the body */}
        <div className="mx-auto w-full max-w-md min-h-screen relative">
          {children}
        </div>

        {/* The BottomNav sits here, safely rendering at the bottom of the screen */}
        <BottomNav />
        
      </body>
    </html>
  );
}

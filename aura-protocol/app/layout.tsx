import "./globals.css"; 
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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body suppressHydrationWarning className="text-zinc-100 min-h-screen pb-28 selection:bg-emerald-500/30 selection:text-emerald-200">
        
        {/* Main application container with a subtle frosted border frame for mobile-first aesthetic */}
        <div className="mx-auto w-full max-w-md min-h-screen relative flex flex-col justify-between border-x border-white/[0.04] bg-[#050507]/80 backdrop-blur-xl shadow-2xl">
          <div className="w-full flex-1">
            {children}
          </div>
          
          {/* Persistent Floating Bottom Navigation */}
          <BottomNav />
        </div>
        
      </body>
    </html>
  );
}

// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    
    // This securely exchanges the Google token for an app session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Success! Send them to the Dashboard
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("Auth callback error:", error.message);
    }
  }

  // If something fails, send them back to login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

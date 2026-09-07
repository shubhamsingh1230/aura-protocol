// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
  // The 'next' param lets us redirect the user back to exactly where they were going
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    
    // This is the critical step: exchanging the URL code for a secure cookie
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Success: Route them into the app
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("Auth callback error:", error.message);
    }
  }

  // Failure: Send them back to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

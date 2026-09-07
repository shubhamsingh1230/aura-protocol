import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server"; // Ensure this imports your SSR client

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard"; // Where to go after login

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error("Auth Exchange Error:", error.message);
    }
  }

  // If no code or there's an error, send them back to the login page with an error flag
  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}

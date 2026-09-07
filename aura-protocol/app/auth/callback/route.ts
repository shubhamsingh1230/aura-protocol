// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error") || searchParams.get("error_description");

  // 1. If Google sent an error back, catch it
  if (oauthError) {
    console.error("Google OAuth rejected the request:", oauthError);
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(oauthError)}`);
  }

  // 2. If there's no code and no error, catch the missing code scenario
  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code_parameter`);
  }

  // Default destination is arena, but we will check below if they need onboarding
let destination = "/dashboard";
  const response = NextResponse.redirect(`${origin}${destination}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers.get("cookie")
            ? parseCookies(request.headers.get("cookie")!)
            : [];
        },
       setAll(cookiesToSet) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, {
      ...options,
      maxAge: 60 * 60 * 24 * 30, // <--- Persistent session storage
    });
  });
},
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/?error=session_exchange_failed`);
  }

  // 3. Check if the user has a profile or has completed onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, onboarding_completed")
    .eq("id", data.user.id)
    .single();

  // If they have no profile row yet or onboarding is false, send them to your setup ritual
  if (!profile || !profile.onboarding_completed) {
    destination = "/onboarding"; // Change this if your onboarding route is named differently (e.g. /setup or /ritual)
  }

  // 4. Build the final redirect response carrying over all session cookies securely
  const finalResponse = NextResponse.redirect(`${origin}${destination}`);
  response.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie.name, cookie.value, cookie.options);
  });

  return finalResponse;
}

function parseCookies(cookieHeader: string) {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

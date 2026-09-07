// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error") || searchParams.get("error_description");

  // 1. If Google sent an error back, catch it so we can see what it is
  if (oauthError) {
    console.error("Google OAuth rejected the request:", oauthError);
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(oauthError)}`);
  }

  // 2. If there's no code and no error, catch the missing code scenario
  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code_parameter`);
  }

  const response = NextResponse.redirect(`${origin}/arena`);

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
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  
  if (!error) {
    return response;
  }

  return NextResponse.redirect(`${origin}/?error=session_exchange_failed`);
}

function parseCookies(cookieHeader: string) {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

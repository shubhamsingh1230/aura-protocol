import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/arena";

  if (!code) {
    return new NextResponse("Auth Error: Missing 'code' parameter from Google redirect.", { status: 400 });
  }

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers.get("cookie") ? parseCookies(request.headers.get("cookie")!) : [];
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

  if (error) {
    // THIS WILL SHOW US THE EXACT PROBLEM INSTEAD OF LOOPING
    return new NextResponse(
      `🚨 SUPABASE AUTH EXCHANGE FAILED: ${error.message} (Status: ${error.status})`, 
      { status: 500 }
    );
  }

  return response;
}

function parseCookies(cookieHeader: string) {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split(";")[0].split("=");
    return { name, value: rest.join("=") };
  });
}

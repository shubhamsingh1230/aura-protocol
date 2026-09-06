import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const next = searchParams.get('next') ?? '/feed';

  // 1. If Supabase/Google sent an error back, display it clearly
  if (errorParam) {
    return NextResponse.json({
      source: "OAuth Provider Error",
      error: errorParam,
      description: errorDescription,
    }, { status: 400 });
  }

  // 2. If code is missing entirely, dump what was received for debugging
  if (!code) {
    return NextResponse.json({
      error: "No code provided in callback query",
      receivedQueryParameters: Object.fromEntries(searchParams.entries()),
      fullUrl: request.url,
      tip: "Check your Supabase Site URL and Redirect URLs configuration."
    }, { status: 400 });
  }

  const cookieStore = cookies();
  const response = NextResponse.redirect(`${url.origin}${next}`);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.json({ 
      message: "Supabase code exchange failed", 
      error: error.message,
      status: error.status 
    }, { status: 500 });
  }

  return response;
}

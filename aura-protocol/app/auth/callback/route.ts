import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/feed';

  if (code) {
    const cookieStore = cookies();
    
    // 1. Create the redirect response target first
    const response = NextResponse.redirect(`${origin}${next}`);

    // 2. Instantiate Supabase client bound directly to the response cookies
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

    // 3. Exchange code for session and attach tokens to response headers
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return response; // Successfully sends cookies to browser and redirects to /feed!
    }
  }

  // Fallback if code is missing or invalid
  return NextResponse.redirect(`${origin}/login?error=Authentication failed. Please try again.`);
}

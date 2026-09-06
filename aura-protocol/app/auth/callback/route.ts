import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/feed';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    // Force the serverless runtime to flush and commit auth cookies before redirecting
    await new Promise((resolve) => setTimeout(resolve, 0));

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect back to login with error if exchange failed
  return NextResponse.redirect(`${origin}/login?error=Authentication failed. Please try again.`);
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Default redirect to feed after successful login
  const next = searchParams.get('next') ?? '/feed';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If code is missing or exchange failed, redirect back to login with error
  return NextResponse.redirect(`${origin}/login?error=Authentication failed. Please try again.`);
}

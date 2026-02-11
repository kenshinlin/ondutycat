import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { locales } from '@/i18n/config';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Get locale from path
  const pathSegments = new URL(request.url).pathname.split('/');
  const locale = locales.includes(pathSegments[1] as typeof locales[number])
    ? (pathSegments[1] as typeof locales[number])
    : 'zh-CN';

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to home page after successful auth
  return NextResponse.redirect(`${origin}/${locale}`);
}

import type { NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';
import { updateSession } from './lib/supabase/middleware'

// Create next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export async function middleware(request: NextRequest) {
  // First update Supabase session
  const supabaseResponse = await updateSession(request)

  // Then apply next-intl middleware
  const intlResponse = intlMiddleware(request)

  // Merge cookies from Supabase response
  if (supabaseResponse.cookies) {
    supabaseResponse.cookies.getAll().forEach(cookie => {
      intlResponse.cookies.set(cookie.name, cookie.value)
    })
  }

  return intlResponse
}

export const config = {
  // Skip all paths that should not be internationalized
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/'],
};

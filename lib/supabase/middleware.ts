import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { settings } from '@/settings'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    settings.supabase.url,
    settings.supabase.anonKey,
    {
      cookies: {
        getAll() {
          // Get all cookies from the request
          const cookies = request.cookies.getAll()
          return cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
          }))
        },
        setAll(cookiesToSet: any[]) {
          // Set cookies on the response
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: any }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Optional: Add redirect logic here based on user presence
  // if (!user && !request.nextUrl.pathname.startsWith('/auth')) {
  //   const url = request.nextUrl.clone()
  //   url.pathname = '/auth/login'
  //   return NextResponse.redirect(url)
  // }

  return supabaseResponse
}

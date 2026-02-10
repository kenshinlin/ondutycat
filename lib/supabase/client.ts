'use client'

import { createBrowserClient } from '@supabase/ssr'
import { settings } from '@/settings'

export function createClient() {
  return createBrowserClient(
    settings.supabase.url,
    settings.supabase.anonKey
  )
}

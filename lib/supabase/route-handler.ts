import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type PendingCookie = { name: string; value: string; options: CookieOptions }

/**
 * Supabase client for Route Handlers: captures Set-Cookie operations so you can apply them to your JSON response.
 */
export function createSupabaseAuthRouteClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const jar: PendingCookie[] = []

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          jar.push({ name, value, options })
        })
      },
    },
  })

  function applyAuthCookies(response: NextResponse) {
    jar.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options)
    })
  }

  return { supabase, applyAuthCookies }
}

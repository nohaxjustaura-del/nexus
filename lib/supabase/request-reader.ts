import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import type { User as SupabaseAuthUser } from '@supabase/supabase-js'

/**
 * Read-only Supabase client (request cookies only). Use in API routes that must not mutate auth cookies.
 */
export function createSupabaseRequestReaderClient(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {
        // read-only
      },
    },
  })
}

export async function getSupabaseAuthUserFromRequest(
  request: NextRequest
): Promise<SupabaseAuthUser | null> {
  const supabase = createSupabaseRequestReaderClient(request)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return null
  }
  return user
}

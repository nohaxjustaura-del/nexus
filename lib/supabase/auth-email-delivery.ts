import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Sends a magic-link email using Supabase Auth (dashboard SMTP / Supabase mail).
 * Use when RESEND_API_KEY is not set or Resend delivery failed.
 */
export async function sendMagicLinkViaSupabaseOtp(params: {
  supabaseUrl: string
  anonKey: string
  email: string
  emailRedirectTo: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient(params.supabaseUrl, params.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const { error } = await supabase.auth.signInWithOtp({
    email: params.email,
    options: {
      emailRedirectTo: params.emailRedirectTo,
    },
  })
  if (error) return { ok: false, message: error.message || 'Supabase sign-in email failed' }
  return { ok: true }
}

export async function sendSignupInviteViaSupabase(params: {
  admin: SupabaseClient
  email: string
  redirectTo: string
  userMetadata: Record<string, unknown>
}): Promise<{ ok: true } | { ok: false; message: string; code?: string }> {
  const { error } = await params.admin.auth.admin.inviteUserByEmail(params.email, {
    data: params.userMetadata,
    redirectTo: params.redirectTo,
  })
  if (error) {
    return { ok: false, message: error.message || 'Invite email failed', code: error.code }
  }
  return { ok: true }
}

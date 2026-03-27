/** Supabase / GoTrue errors that mean the email is already registered. */
export function isExistingUserAuthError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false
  if (err.code === 'email_exists') return true
  const msg = (err.message || '').toLowerCase()
  if (msg.includes('already been registered') || msg.includes('already registered')) return true
  if (msg.includes('already exists') && (msg.includes('user') || msg.includes('email'))) return true
  if (msg.includes('duplicate') && msg.includes('email')) return true
  if (msg.includes('user with this email') && msg.includes('registered')) return true
  if (msg.includes('a user with this email address has already been registered')) return true
  return false
}

import disposableDomains from 'disposable-email-domains'

const DISPOSABLE = new Set(disposableDomains as string[])

function emailDomain(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at < 0 || at === email.length - 1) return null
  return email.slice(at + 1).toLowerCase().trim()
}

/** True if the host (or any parent host) is on the disposable list. */
export function isDisposableSignupEmail(email: string): boolean {
  const domain = emailDomain(email)
  if (!domain) return false
  const labels = domain.split('.').filter(Boolean)
  for (let i = 0; i < labels.length; i++) {
    if (DISPOSABLE.has(labels.slice(i).join('.'))) return true
  }
  return false
}

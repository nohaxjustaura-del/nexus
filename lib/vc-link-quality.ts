/**
 * VC profile URL normalization and quality checks for admin tooling and safe hrefs.
 */

export type VcLinkField = 'websiteUrl' | 'linkedinUrl' | 'applicationUrl'

export type VcLinkIssue = {
  field: VcLinkField
  message: string
}

export type VcLinkAnalysis = {
  safeWebsite: string | null
  safeLinkedin: string | null
  safeApplication: string | null
  issues: VcLinkIssue[]
  /** No blocking link issues; safe to treat as link-clean for verification. */
  linkClean: boolean
}

const BLOCKED_SCHEMES = /^(javascript|data|vbscript):/i

function normalizeOne(
  raw: string | null | undefined,
  field: VcLinkField,
  options: { linkedin?: boolean }
): { href: string | null; issues: VcLinkIssue[] } {
  const issues: VcLinkIssue[] = []
  if (raw == null) return { href: null, issues }
  const trimmed = String(raw).trim()
  if (!trimmed) return { href: null, issues }

  if (BLOCKED_SCHEMES.test(trimmed)) {
    issues.push({ field, message: 'Unsafe or disallowed URL scheme' })
    return { href: null, issues }
  }

  let s = trimmed
  if (!/^https?:\/\//i.test(s)) {
    if (s.startsWith('//')) {
      s = `https:${s}`
    } else if (/^[a-z0-9][a-z0-9+.-]*:\/\//i.test(s)) {
      issues.push({ field, message: 'URL uses a non-http(s) scheme' })
      return { href: null, issues }
    } else if (/^[a-z0-9.-]+\.[a-z]{2,}([/?#].*)?$/i.test(s)) {
      s = `https://${s}`
    } else {
      issues.push({ field, message: 'Invalid or incomplete URL (add https:// or a valid domain)' })
      return { href: null, issues }
    }
  }

  let u: URL
  try {
    u = new URL(s)
  } catch {
    issues.push({ field, message: 'Could not parse URL' })
    return { href: null, issues }
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    issues.push({ field, message: 'Only http and https URLs are allowed' })
    return { href: null, issues }
  }

  if (options.linkedin) {
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    const ok =
      host === 'linkedin.com' ||
      host.endsWith('.linkedin.com') ||
      host === 'lnkd.in' ||
      host.endsWith('.lnkd.in')
    if (!ok) {
      issues.push({
        field,
        message: 'LinkedIn URL should be on linkedin.com or lnkd.in',
      })
      return { href: null, issues }
    }
  }

  return { href: u.toString(), issues }
}

export function analyzeInvestorLinks(input: {
  websiteUrl?: string | null
  linkedinUrl?: string | null
  applicationUrl?: string | null
}): VcLinkAnalysis {
  const w = normalizeOne(input.websiteUrl, 'websiteUrl', {})
  const l = normalizeOne(input.linkedinUrl, 'linkedinUrl', { linkedin: true })
  const a = normalizeOne(input.applicationUrl, 'applicationUrl', {})

  const issues = [...w.issues, ...l.issues, ...a.issues]
  return {
    safeWebsite: w.href,
    safeLinkedin: l.href,
    safeApplication: a.href,
    issues,
    linkClean: issues.length === 0,
  }
}

import { auditInvestorLocal, type InvestorLocalAuditInput } from '@/lib/investor-quality-audit'
import { analyzeInvestorLinks } from '@/lib/vc-link-quality'

/**
 * Strict bar for investors that should be discoverable in the product:
 * real firm signal, thesis/bio, stages/sectors/geo, check size, valid links,
 * embedding for vector match, and no placeholder ingest email.
 */

export type PristineInvestorInput = InvestorLocalAuditInput & {
  linkedinUrl: string | null
  applicationUrl: string | null
  checkMin: number
  checkMax: number
}

const PRISTINE_WARN_CODES = new Set([
  'thesis_missing',
  'thesis_too_short',
  'bio_thin',
  'sectors_empty',
  'geography_empty',
])

const PLACEHOLDER_EMAIL = /@placeholder\.invalid$/i

export type PristineEval = {
  ok: boolean
  reasons: string[]
}

export type EvaluatePristineOptions = {
  /** When re-embedding from DB (rebuild-faiss-index), rows may not have vectors yet — skip embedding_missing. */
  ignoreEmbedding?: boolean
}

/**
 * Returns whether this row should remain public discoverable for founders.
 */
export function evaluateInvestorPristine(
  inv: PristineInvestorInput,
  options?: EvaluatePristineOptions,
): PristineEval {
  const reasons: string[] = []
  const audit = auditInvestorLocal(inv)

  for (const iss of audit.issues) {
    if (iss.level === 'error') {
      reasons.push(iss.code)
    }
    if (iss.level === 'warn' && PRISTINE_WARN_CODES.has(iss.code)) {
      reasons.push(iss.code)
    }
  }

  if (PLACEHOLDER_EMAIL.test((inv.email || '').trim())) {
    reasons.push('placeholder_email')
  }

  const hasCheck =
    inv.checkMin > 0 ||
    inv.checkMax > 0 ||
    inv.checkSizeMin > 0 ||
    inv.checkSizeMax > 0
  if (!hasCheck) {
    reasons.push('check_size_unknown')
  }

  const links = analyzeInvestorLinks({
    websiteUrl: inv.websiteUrl,
    linkedinUrl: inv.linkedinUrl,
    applicationUrl: inv.applicationUrl,
  })
  if (!links.linkClean) {
    reasons.push('link_invalid')
  }
  if (!links.safeWebsite && !links.safeLinkedin) {
    reasons.push('no_verified_web_presence')
  }

  if (!options?.ignoreEmbedding) {
    const emb = (inv.embedding || '').trim()
    if (!emb || emb === '[]') {
      reasons.push('embedding_missing')
    }
  }

  const unique = [...new Set(reasons)]
  return { ok: unique.length === 0, reasons: unique }
}

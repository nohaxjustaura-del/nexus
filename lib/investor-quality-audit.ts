import { isLikelyRealFirmName } from './firm-name-quality'
import { isDealAnnouncementThesis } from './thesis-sanitize'

export type QualityIssueLevel = 'error' | 'warn' | 'info'

export type QualityIssue = {
  level: QualityIssueLevel
  code: string
  message: string
}

/** Minimal investor shape for static quality checks (no network). */
export type InvestorLocalAuditInput = {
  id: string
  firmName: string
  email: string
  thesis: string | null
  bio: string
  checkSizeMin: number
  checkSizeMax: number
  stages: string
  sectors: string
  geography: string
  /** Directory geo (often populated when geography JSON is empty) */
  geoFocus?: string | null
  fundType: string
  portfolio: string | null
  websiteUrl: string | null
  embedding: string | null
  isPublic: boolean
  discoverable: boolean
}

export type LocalInvestorAudit = {
  id: string
  firmName: string
  issues: QualityIssue[]
  errorCount: number
  warnCount: number
  infoCount: number
}

function parseJsonArray(raw: string | null | undefined): unknown[] {
  try {
    const x = JSON.parse(raw || '[]')
    return Array.isArray(x) ? x : []
  } catch {
    return []
  }
}

/**
 * Deterministic quality gate for one Investor row (DB bots + ingest).
 * Does not call Exa/LLM — use verifyInvestorAgainstExa for live web cross-check.
 */
export function auditInvestorLocal(inv: InvestorLocalAuditInput): LocalInvestorAudit {
  const issues: QualityIssue[] = []

  if (!isLikelyRealFirmName(inv.firmName)) {
    issues.push({
      level: 'error',
      code: 'firm_name_suspect',
      message: 'Firm name fails isLikelyRealFirmName (noisy/list-like/garbage pattern)',
    })
  }

  const thesis = (inv.thesis || '').trim()
  if (!thesis) {
    issues.push({ level: 'warn', code: 'thesis_missing', message: 'Thesis is empty' })
  } else if (thesis.length < 40) {
    issues.push({
      level: 'warn',
      code: 'thesis_too_short',
      message: `Thesis very short (${thesis.length} chars) — likely incomplete`,
    })
  } else if (isDealAnnouncementThesis(thesis)) {
    issues.push({
      level: 'error',
      code: 'thesis_deal_headline',
      message: 'Thesis reads like a single deal / PR headline, not investment mandate',
    })
  }

  const bio = (inv.bio || '').trim()
  if (!bio || bio.length < 20) {
    issues.push({ level: 'warn', code: 'bio_thin', message: 'Bio missing or very short' })
  }

  const stages = parseJsonArray(inv.stages)
  if (stages.length === 0) {
    issues.push({
      level: 'error',
      code: 'stages_empty',
      message: 'Stages JSON is empty — matching filters may skip this VC',
    })
  }

  const sectors = parseJsonArray(inv.sectors)
  if (sectors.length === 0) {
    issues.push({ level: 'warn', code: 'sectors_empty', message: 'Sectors JSON is empty' })
  }

  const geo = parseJsonArray(inv.geography)
  const geoFocusArr = parseJsonArray(inv.geoFocus)
  if (geo.length === 0 && geoFocusArr.length === 0) {
    issues.push({ level: 'warn', code: 'geography_empty', message: 'Geography and geo focus are empty' })
  }

  if (inv.checkSizeMin > 0 && inv.checkSizeMax > 0 && inv.checkSizeMin > inv.checkSizeMax) {
    issues.push({
      level: 'error',
      code: 'check_size_inverted',
      message: `checkSizeMin (${inv.checkSizeMin}) > checkSizeMax (${inv.checkSizeMax})`,
    })
  }

  if (inv.checkSizeMin === 0 && inv.checkSizeMax === 0) {
    issues.push({
      level: 'warn',
      code: 'check_size_unknown',
      message: 'Check size min/max both zero',
    })
  }

  const port = parseJsonArray(inv.portfolio)
  if (port.length === 0) {
    issues.push({ level: 'info', code: 'portfolio_empty', message: 'No portfolio companies listed' })
  }

  if (!inv.websiteUrl?.trim()) {
    issues.push({ level: 'info', code: 'website_missing', message: 'No websiteUrl' })
  }

  if (inv.fundType === 'Venture Capital') {
    issues.push({
      level: 'info',
      code: 'fund_type_default',
      message: 'fundType still default "Venture Capital" — may be unclassified',
    })
  }

  if (inv.isPublic && inv.discoverable) {
    const emb = (inv.embedding || '').trim()
    if (!emb || emb === '[]') {
      issues.push({
        level: 'warn',
        code: 'embedding_missing',
        message: 'Public discoverable row has no embedding — weak in vector match',
      })
    }
  }

  if (inv.email.endsWith('@placeholder.invalid')) {
    issues.push({
      level: 'info',
      code: 'placeholder_email',
      message: 'Placeholder ingest email (expected for auto-researched VCs)',
    })
  }

  const errorCount = issues.filter((i) => i.level === 'error').length
  const warnCount = issues.filter((i) => i.level === 'warn').length
  const infoCount = issues.filter((i) => i.level === 'info').length

  return { id: inv.id, firmName: inv.firmName, issues, errorCount, warnCount, infoCount }
}

/** Sort key: worst rows first (errors, then warns). */
export function auditSeverityScore(a: LocalInvestorAudit): number {
  return a.errorCount * 100 + a.warnCount * 10 + a.infoCount
}

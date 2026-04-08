/**
 * Which Investor rows should receive Exa/LLM worker spend (thesis, profile, contact, enrichment).
 * Stricter than isLikelyRealFirmName alone — blocks article titles, listicles, generic labels,
 * and mashed asset-class strings mistaken for firm names.
 *
 * `shouldAutoHideInvestorByName` reuses this for Discover cleanup (see worker:hide-low-quality):
 * ineligible names are candidates to set isPublic/discoverable false — they are not auto-hidden
 * by research skips alone.
 */

import { isLikelyRealFirmName } from '@/lib/firm-name-quality'

const GENERIC_SECTOR_VC = /^(aussie|biotech|fintech|healthtech|saas|climate|deeptech|defense|blockchain)\s+vc$/i

/** “Biotech Venture Capital” style — category, not a single fund. */
const GENERIC_CATEGORY_THREE = /^biotech\s+venture\s+capital$/i

export function isInvestorEligibleForWorkers(firmName: string): boolean {
  if (!isLikelyRealFirmName(firmName)) return false
  const t = firmName.trim()

  if (t.length > 72) return false

  // Latin-first directory: long strings with no English letters are usually foreign/SERP scrapes
  // (e.g. headline or nav text stored as firmName). Allow short tokens and mixed names with Latin.
  if (t.length > 10 && !/[a-zA-Z]{2,}/.test(t)) return false

  const words = t.split(/\s+/).filter(Boolean)
  if (words.length > 8) return false

  // Mashed words without space (e.g. …EquityReal Estate… → EquityReal)
  if (/[a-z][A-Z]/.test(t) && t.length > 24) return false

  if (GENERIC_SECTOR_VC.test(t)) return false
  if (GENERIC_CATEGORY_THREE.test(t)) return false

  // Long “startup pitch” titles stored as firmName
  if (/\bstartup\b/i.test(t) && words.length >= 5) return false
  if (/\bdeeptech\b/i.test(t) && words.length >= 4) return false

  // Listicle / multi-asset-class headlines
  if (/^asset\s+classes\b/i.test(t)) return false
  const assetMarkers =
    t.match(
      /(private\s+equity|real\s+estate|fixed\s+income|public\s+equities|asset\s+classes)/gi,
    ) ?? []
  if (assetMarkers.length >= 2) return false

  if (/\b(firms\s*&|funding\s+strategies|ipo\s+insights)\b/i.test(t)) return false
  if (/\b(biggest|top\s+\d+)\s+/i.test(t) && /\bfund\b/i.test(t)) return false

  return true
}

/** True → safe to auto-hide from product + workers (isPublic/discoverable false). */
export function shouldAutoHideInvestorByName(firmName: string): boolean {
  return !isInvestorEligibleForWorkers(firmName)
}

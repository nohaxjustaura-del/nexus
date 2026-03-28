/**
 * Normalize VC firm names that were stored as news headlines / SERP junk.
 */

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function isNonFirmArticleTitle(s: string): boolean {
  const t = s.toLowerCase()
  if (/^#+\s/.test(s)) return false // handled by exact map / later; some map to real firms
  if (/\b10 vc funds\b/i.test(s)) return true
  if (/\bsharply higher capital deployment\b/i.test(s)) return true
  if (/\bbebeez international\b/i.test(t)) return true
  if (/\bmedcity\s+news\b/i.test(t)) return true
  if (/\bjanuary proptech venture capital\b/i.test(t)) return true
  if (/\bquantonation closes.*—\s*tfn\b/i.test(t)) return true
  if (/\bmexican investment veterans launch\b/i.test(t)) return true
  // Kyoto headlines map to KYOTO-iCAP / Kyoto University IC — handled in normalizeHeadlineFirmName
  if (/\bnotice of establishment\b/i.test(t)) return true
  if (/\boverview of the\b/i.test(t)) return true
  if (/\boverview of the kyoto\b/i.test(t)) return true
  if (/\bwhy this \$[\d.]+\w*\s+fund matters\b/i.test(t)) return true
  if (/\bnordic vc ecosystem\b/i.test(t)) return true
  if (/\bvc summit\b/i.test(t)) return true
  if (/^###?\s*fund\s*$/i.test(s)) return true
  if (/^stage\s+b2b\s+technology\s+fund\b/i.test(t)) return true
  return false
}

const EXACT_CANONICAL: Record<string, string> = {
  'CEE VC': 'Credo Ventures',
  'GMO Launches Global Fund': 'GMO VenturePartners',
  'GMO Launches Global Fund 8 for Fintech and AI Startups': 'GMO VenturePartners',
  '# GMO Launches New Fund for Fintech and AI Startups': 'GMO VenturePartners',
  'Launches Venture Capital Fund And Asset Management Company': 'Air Street Capital',
  'Million Software Growth Equity Fund': 'Updata Partners',
  '# Updata Partners Closes $875 Million Software Growth Equity Fund': 'Updata Partners',
  'Cloudberry launches Europe’s first semiconductor venture fund': 'Cloudberry Ventures',
  "Cloudberry launches Europe's first semiconductor venture fund": 'Cloudberry Ventures',
  '# Paris-based VC firm Elaia closes €134M deeptech seed fund': 'Elaia Partners',
  'based VC firm Elaia closes €134M deeptech seed fund': 'Elaia Partners',
  // Scraped fund / SERP noise → operating firm (India deep-tech)
  'accelerator model': 'ValleyNXT Ventures',
  'With Bharat Breakthrough Fund': 'ValleyNXT Ventures',
  'Cr Bharat Breakthrough Fund': 'ValleyNXT Ventures',
  'Bharat Breakthrough Fund': 'ValleyNXT Ventures',
  'Bharat Breakthrough Fund-I': 'ValleyNXT Ventures',
  'ValleyNext Ventures': 'ValleyNXT Ventures',
  'crossover fund venture biotech 2026 India': 'ValleyNXT Ventures',
  'venture capital SPV deployment hardware India': 'ValleyNXT Ventures',
}

function firmHintFromThesis(thesis: string | undefined | null): string | null {
  if (!thesis) return null
  const focus = thesis.match(
    /^([A-Za-z0-9][A-Za-z0-9 &',.-]{1,90}?)\s+focus(?:es|ing)?\b/i,
  )
  if (focus) {
    const name = focus[1].trim()
    if (name.length >= 3 && name.length <= 90) return name
  }
  for (const re of [
    /\b(ValleyNXT Ventures)\b/,
    /\b(Exfinity Venture Partners)\b/,
    /\b(Kairon Capital)\b/,
    /\b(Somerset Indus Capital Partners)\b/,
    /\b(CedarBridge Capital Partners)\b/,
    /\b(Neon Fund)\b/,
    /\b(Navam Capital)\b/,
    /\b(Middha Ventures)\b/,
    /\b(Oikaze Ventures)\b/,
    /\b(Metaplanet Ventures)\b/,
    /\b(Air Street Capital)\b/,
    /\b(Credo Ventures)\b/,
    /\b(Updata Partners)\b/,
    /\b(GMO VenturePartners)\b/,
    /\b(Elaia Partners)\b/,
    /\b(European Investment Fund)\b/,
  ]) {
    const m = thesis.match(re)
    if (m) return m[1]
  }
  return null
}

/** "Launches €50m Cloudberry Ventures" → "Cloudberry Ventures"; reject "Million Fund I". */
/** True when text before "Launches $/€" is already a plausible firm — do not take fund name after amount. */
function isPlausibleFirmBeforeLaunch(before: string): boolean {
  const t = before.trim()
  if (!t || t.length > 52) return false
  if (/\b(Executive|Former|investor|backer|Google|Microsoft)\b/i.test(t)) return false
  // Two-word person names ("Abhishek Middha") are not firm names
  if (
    /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(t) &&
    !/\b(Ventures|Capital|Partners|Fund|VC|Labs|Group|Asset)\b/i.test(t)
  ) {
    return false
  }
  if (/\b(Ventures|Capital|Partners|VC|Labs|Holdings|Management|Fund)\s*$/i.test(t)) {
    return true
  }
  // Short brand-like tokens: Persistent, DTCP, SparkLabs, 2150, U2V, EIF, …
  if (/^[A-ZÄÖÜa-z0-9][\w.+]*(?:\s+[A-ZÄÖÜa-z0-9][\w.+]*){0,4}$/.test(t)) {
    return true
  }
  return false
}

function firmAfterLaunchWithAmount(s: string): string | null {
  const m = s.match(/\bLaunches\s+(?:€|\$)[\d.,]+\s*(?:m|mm|million|b|bn|billion)?\s+(.+)$/i)
  if (!m) return null
  const rest = m[1].trim().replace(/[.,;:]+$/, '')
  if (!rest) return null
  if (/^(million|billion|fund)\b/i.test(rest)) return null
  if (/^Fund\s+[IVX\d]/i.test(rest)) return null
  if (/^fund\s+to\b/i.test(rest)) return null
  if (/^(million|billion)\s+fund\b/i.test(rest)) return null
  if (/\b(university|backed by qia|initial close)\b/i.test(rest)) return null
  if (rest.length > 70) return null
  return rest
}

function stripLeadingCountry(s: string): string {
  const countries =
    /^(Saudi Arabia|United Kingdom|Denmark|Germany|Japan|Canada|Poland|Israel|USA|UK|UAE|Netherlands|France|Spain|Italy|Sweden|Norway|Finland)\s+/i
  let out = s
  let prev = ''
  while (out !== prev && countries.test(out)) {
    prev = out
    out = out.replace(countries, '')
  }
  return out
}

function cleanupFirmHead(head: string): string {
  let h = head.trim().replace(/[.,;:]+$/, '').trim()
  h = h.replace(/^based\s+VC\s+firm\s+/i, '')
  h = h.replace(/^(?:US|UK)\s+[\w-]+\s+investor\s+/i, '')
  h = h.replace(/^[\w.]+\s+backer\s+/i, '')
  h = /^Atomico\s+V$/i.test(h) ? 'Atomico' : h
  return h.trim()
}

/** Strip newsletter / SERP junk prefixes (repeat until stable). */
export function stripSerpFundPrefixes(input: string): string {
  let s = input
  let prev = ''
  const patterns = [
    /^Fund IV Follow Us New Update\s+/i,
    /^Follow Us New Update\s+/i,
    /^Google Overview\s+/i,
    /^News SUMMARY\s+/i,
  ]
  while (s !== prev) {
    prev = s
    for (const re of patterns) {
      s = s.replace(re, '').trim()
    }
  }
  return s
}

function expandShortLaunchBrand(head: string): string {
  const h = head.trim()
  if (/^GMO$/i.test(h)) return 'GMO VenturePartners'
  if (/^ValleyNXT$/i.test(h)) return 'ValleyNXT Ventures'
  if (/^Metaplanet$/i.test(h)) return 'Metaplanet Ventures'
  return h
}

/**
 * Headlines like "X Launches Y": pick operator (left) when Y is a fund announcement,
 * or vehicle name (right) when left is a person / non-firm.
 */
function resolveLaunchesHeadline(s: string): string | null {
  const m = s.match(/^(.+?)\s+Launches\s+(.+)$/i)
  if (!m) return null
  const L = m[1].trim()
  const R = m[2].trim().replace(/[.;:]+$/, '').trim()

  const fundAnnouncement =
    /[₹£€$]|April\s+\d|\bcrore\b|\bINR\b|\bFund\s+(?:III|II|I)\b|\bBharat\s+Breakthrough\b|M\s+Venture\s+Fund\s+To\s+Support|Bitcoin\s+Venture\s+Fund|Physical\s+AI\s+Seed\s+Fund|Foundations\s+Accelerator|Global\s+Fund(?:\s+\d)?|for\s+Fintech\s+and\s+AI|Its\s+Third\s+Fund|Deep\s+Tech\s+Fund\s+with\s+Accelerator|₹\s*\d|King\s+Saud\s+University|University\s+Venture\s+Fund/m.test(
      R,
    )

  const rightIsStandaloneFirm =
    /\b(Ventures|Capital Partners|Venture Partners|Capital|Partners)\s*$/i.test(R) &&
    !/[₹£€]|April\s+\d|crore|Bharat\s+Breakthrough|Launches\s+April/i.test(R)

  if (fundAnnouncement && isPlausibleFirmBeforeLaunch(L)) {
    return expandShortLaunchBrand(cleanupFirmHead(L))
  }

  if (rightIsStandaloneFirm && !isPlausibleFirmBeforeLaunch(L)) {
    return cleanupFirmHead(R)
  }

  if (rightIsStandaloneFirm && /\bInvestor\s+/i.test(L)) {
    return cleanupFirmHead(R)
  }

  // "Metaplanet Launches Bitcoin Venture Fund" — R is a fund vehicle, L is GP brand
  if (
    isPlausibleFirmBeforeLaunch(L) &&
    /\b(Venture Fund|Seed Fund)\b/i.test(R) &&
    !/\b(Ventures|Capital|Partners)\s*$/i.test(R)
  ) {
    return expandShortLaunchBrand(cleanupFirmHead(L))
  }

  return null
}

/**
 * Returns a cleaner firm name, or null if the string is a non-firm article / unparsed.
 */
export function normalizeHeadlineFirmName(
  raw: string,
  thesis?: string | undefined | null,
): string | null {
  let s = decodeEntities(raw)
  if (!s) return null

  s = stripSerpFundPrefixes(s)

  if (EXACT_CANONICAL[s]) return EXACT_CANONICAL[s]

  // Scraped titles with unreliable or missing firm attribution — manual review / delete
  if (
    /^Google exec launches\b/i.test(s) ||
    /^New accelerator launches to scale\b/i.test(s) ||
    /^500 Million Venture Fund Launches April\b/i.test(s) ||
    /^King Saud University venture fund launches$/i.test(s) ||
    /^Valley Company Launches\b/i.test(s)
  ) {
    return null
  }

  if (/#?\s*Kyoto University Launches\s+KYOTO-iCAP/i.test(s)) {
    return 'Kyoto University Innovation Capital (KYOTO-iCAP)'
  }

  if (/^Quantonation\s+closes\b/i.test(s)) return 'Quantonation'

  if (/^MedCity\s+News\s+/i.test(s)) {
    s = s.replace(/^MedCity\s+News\s+/i, '').trim()
  }

  if (/^FIRSTPICK\s+launches\b/i.test(s)) return 'FIRSTPICK'

  if (EXACT_CANONICAL[s]) return EXACT_CANONICAL[s]

  // WAYA CedarBridge → CedarBridge (thesis uses CedarBridge Capital Partners)
  if (/^WAYA\s+CedarBridge\b/i.test(s) && /\bLaunches\b/i.test(s)) {
    return 'CedarBridge Capital Partners'
  }

  const launchesResolved = resolveLaunchesHeadline(s)
  if (launchesResolved) return launchesResolved

  // Markdown listicles / press titles (except explicit EXACT_CANONICAL keys above)
  if (/^#+\s/.test(s)) return null

  if (isNonFirmArticleTitle(s)) return null

  const commaFounded = s.match(/^([^,]{3,80}),\s*founded by\b/i)
  if (commaFounded) return commaFounded[1].trim()

  s = s.replace(/^MENA['']?s\s+/i, '')

  // Startup round → lead investor
  const ledBy = s.match(/\bled by\s+(.+)$/i)
  if (ledBy) {
    let tail = ledBy[1].replace(/\s*\([^)]*\)\s*$/, '').trim()
    tail = tail.replace(/[.,;:]+$/, '').trim()
    if (tail.length >= 3 && tail.length <= 100) {
      const beforeLed = s.slice(0, s.search(/\bled by\b/i)).trim()
      const messyLead =
        beforeLed.length > 35 ||
        /\bseries\s+[a-z]\s+led by\b/i.test(s) ||
        /\bfunding reaches\b/i.test(s) ||
        /\bseed funding led by\b/i.test(s)
      if (
        messyLead ||
        /\braises\b|\bbridge round\b|\bseed round\b|\bfunding\b/i.test(s)
      ) {
        return tail
      }
    }
  }

  // Remove SERP chrome (do not eat the firm name)
  s = s.replace(/^(?:USA\s+|Interviews\s+)?Search\s+Home\s+/i, '')
  s = s.replace(/^Home\s+(?:Germany|Israel|Canada|Saudi Arabia|USA)\s+/i, '')

  s = stripLeadingCountry(s)

  const evolves = s.match(/\bEvolves\s+Into\s+(.+)$/i)
  if (evolves) {
    s = evolves[1].replace(/;.*$/, '').trim()
  }

  if (EXACT_CANONICAL[s]) return EXACT_CANONICAL[s]

  // "Former … Launches €Xm Name" → take name after amount
  if (/\bFormer\b.*\bLaunches\s+€/i.test(s)) {
    const tail = firmAfterLaunchWithAmount(s)
    if (tail) return tail
  }

  // Only use launch-tail when the left side is not already a firm (e.g. Former … Executive)
  const launchIdx = s.search(/\bLaunches\s+(?:€|\$|₹|£)/i)
  if (launchIdx > 0) {
    const beforeLaunch = s.slice(0, launchIdx).trim()
    if (
      isPlausibleFirmBeforeLaunch(beforeLaunch) &&
      /\bLaunches\s+(?:₹|£)/i.test(s.slice(launchIdx))
    ) {
      return expandShortLaunchBrand(cleanupFirmHead(beforeLaunch))
    }
    const launchTail = firmAfterLaunchWithAmount(s)
    if (
      launchTail &&
      !isPlausibleFirmBeforeLaunch(beforeLaunch)
    ) {
      return launchTail
    }
  }

  s = s.replace(/\s+Closes\s+Fund.*$/i, '').trim()

  const verbSplit = s.match(
    /^(.+?)\s+(unveils|raises|closes|closes its|launch(?:es)?|closed|closing)\b/i,
  )
  if (verbSplit) {
    const head = cleanupFirmHead(verbSplit[1])
    if (head.length >= 2 && head.length <= 100) {
      if (head === 'Cloudberry' && thesis?.includes('Cloudberry Ventures')) {
        return 'Cloudberry Ventures'
      }
      if (head === 'Epidarex') return 'Epidarex Capital'
      const hint = firmHintFromThesis(thesis)
      if (
        hint &&
        !isPlausibleFirmBeforeLaunch(head) &&
        /\bLaunches\b/i.test(s)
      ) {
        return hint
      }
      return expandShortLaunchBrand(head)
    }
  }

  if (/^Launches\s+/i.test(s)) {
    const hint = firmHintFromThesis(thesis)
    if (hint) return hint
    return null
  }

  if (/^#+\s/.test(s)) {
    const hint = firmHintFromThesis(thesis)
    if (hint) return hint
    return null
  }

  // "Deepankur Malhotra Kairon Capital" + thesis "Kairon Capital focuses…"
  const thesisFirm = firmHintFromThesis(thesis)
  if (thesisFirm && s.length > thesisFirm.length + 4) {
    const escaped = thesisFirm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    try {
      if (new RegExp(`\\b${escaped}$`, 'i').test(s)) return thesisFirm
    } catch {
      /* invalid pattern */
    }
  }

  return s
}

export function looksLikeFundraisingHeadline(name: string): boolean {
  const raw = decodeEntities(name)
  if (!raw) return false
  const s = stripSerpFundPrefixes(raw)
  if (EXACT_CANONICAL[raw] || EXACT_CANONICAL[s]) return true
  if (/^accelerator model$/i.test(s)) return true
  if (/^crossover fund venture biotech/i.test(s)) return true
  if (/^venture capital SPV deployment/i.test(s)) return true
  if (/^Cr Bharat\b/i.test(s)) return true
  if (/^With Bharat\b/i.test(s)) return true
  if (/^Bharat Breakthrough Fund/i.test(s)) return true
  if (/Follow Us New Update\b/i.test(raw)) return true
  if (/^Google Overview\b/i.test(raw)) return true
  if (/^News SUMMARY\b/i.test(raw)) return true
  if (/^Fund IV Follow Us New Update\b/i.test(raw)) return true
  if (isNonFirmArticleTitle(s)) return true
  if (/^#+\s/.test(s)) return true
  if (/\bSearch\s+Home\b/i.test(s)) return true
  if (/^Home\s+(Germany|Israel|Canada|Saudi Arabia)\s/i.test(s)) return true
  if (
    /\b(unveils|raises\s+\$|raises\s+€|closes\s+\$|closes\s+€|Closes\s+\$|Launches\s+\$|Launches\s+€|Launches\s+[₹£]|launches\s+\$|launches\s+€|launches\s+[₹£])\b/i.test(
      s,
    )
  ) {
    return true
  }
  if (/\bLaunches\s+.*\b(crore|INR|April\s+\d)/i.test(s)) return true
  if (/\bLaunches\b/i.test(s)) return true
  if (/\bbridge round\b/i.test(s) && /\bled by\b/i.test(s)) return true
  if (/\bEvolves\s+Into\b/i.test(s)) return true
  if (/^Launches\s+/i.test(s)) return true
  if (/\bfor fourth fund\b/i.test(s)) return true
  if (/\bfor AI-focused debut\b/i.test(s)) return true
  if (/\bAmid Slow Venture\b/i.test(s)) return true
  if (/\bSurpassing Target\b/i.test(s)) return true
  if (/Growth Equity Fund\s*\|/i.test(s)) return true
  if (/^##?\s/.test(s)) return true
  if (/\bvc summit\b/i.test(s)) return true
  if (/\boverview of the\b/i.test(s)) return true
  if (/\bnotice of establishment\b/i.test(s)) return true
  if (/^based\s+VC\s+firm\b/i.test(s)) return true
  if (/^MedCity\s+News\b/i.test(s)) return true
  return false
}

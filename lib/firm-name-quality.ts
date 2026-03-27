const BAD_SUBSTRINGS = [
  '[exa ',
  'http://',
  'https://',
  'linkedin.com',
  'wikipedia',
  'top 10',
  'top ten',
  'best vc',
  'list of',
  'ranking',
]

const BAD_PHRASES = ['venture builder fund']
const NOISE_WORDS = new Set([
  'investor',
  'investors',
  'outreach',
  'raising',
  'marketing',
  'database',
  'template',
  'guide',
  'methodology',
  'curated',
  'list',
  'lists',
  'ranked',
  'ranking',
  'services',
  'agency',
  'about',
  'the',
])

function normalizedWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Fast quality guard to reject noisy/non-firm rows before they enter pipelines.
 * This should be conservative: block obvious garbage, not edge-case real brands.
 */
export function isLikelyRealFirmName(name: string): boolean {
  const t = (name || '').trim()
  if (!t) return false
  if (/^[A-Z0-9]{2,5}$/.test(t)) return true
  if (t.length < 3 || t.length > 120) return false
  if (t.includes('|') || t.includes('[') || t.includes(']')) return false

  const lower = t.toLowerCase()
  for (const bad of BAD_SUBSTRINGS) {
    if (lower.includes(bad)) return false
  }
  for (const phrase of BAD_PHRASES) {
    if (lower.includes(phrase)) return false
  }
  if (/\b(their|this)\s+fund\b/i.test(t)) return false
  if (/^fund performance\b/i.test(t)) return false
  if (/^funds?\s+that\b/i.test(t)) return false
  if (/^sectors?\b/i.test(t)) return false
  if (/^asset management$/i.test(t)) return false
  if (/^inaugural fund$/i.test(t)) return false
  if (/^about the fund$/i.test(t)) return false
  if (/\barchives?\b/i.test(t)) return false

  if (/^\d+$/.test(t.replace(/\s/g, ''))) return false

  const words = normalizedWords(t)
  if (words.length > 10) return false
  const noiseHits = words.filter((w) => NOISE_WORDS.has(w)).length
  if (noiseHits >= 2) return false

  return true
}

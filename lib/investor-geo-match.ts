/**
 * Geography helpers for investor ↔ founder matching.
 * Fixes cases like founder "Cerritos" vs investor "US" where naive substring matching fails.
 */

/** US + DC; PR/GU optional for founders — keep mainland-focused */
const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA',
  'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK',
  'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
])

/** Longest multi-word states first to avoid partial matches */
const US_STATE_NAMES_DESC: string[] = [
  'district of columbia',
  'north carolina',
  'north dakota',
  'south carolina',
  'south dakota',
  'new hampshire',
  'new jersey',
  'new mexico',
  'new york',
  'rhode island',
  'west virginia',
  'connecticut',
  'pennsylvania',
  'massachusetts',
  'california',
  'washington',
  'wisconsin',
  'minnesota',
  'louisiana',
  'tennessee',
  'kentucky',
  'maryland',
  'oklahoma',
  'missouri',
  'arkansas',
  'colorado',
  'alabama',
  'arizona',
  'florida',
  'georgia',
  'indiana',
  'illinois',
  'iowa',
  'kansas',
  'michigan',
  'montana',
  'maine',
  'nevada',
  'nebraska',
  'delaware',
  'idaho',
  'hawaii',
  'oregon',
  'ohio',
  'texas',
  'utah',
  'vermont',
  'virginia',
  'wyoming',
  'alaska',
  'mississippi',
]

/**
 * US cities / metros / regions not containing a state name — for founders who only enter a city.
 * Keep alphabetically grouped by region for maintenance; extend as needed.
 */
const US_LOCALITY_HINTS: string[] = [
  // Greater LA / Orange County (Cerritos case)
  'los angeles',
  'cerritos', 'anaheim', 'irvine', 'santa ana', 'orange county', 'long beach', 'pasadena', 'glendale',
  'burbank', 'torrance', 'fullerton', 'garden grove', 'huntington beach', 'santa monica', 'inglewood',
  'thousand oaks', 'simi valley', 'west covina', 'norwalk', 'downey', 'el monte', 'compton', 'carson',
  'santa clarita', 'costa mesa', 'westminster', 'buena park', 'lakewood', 'newport beach', 'whittier',
  'hawthorne', 'alhambra', 'upland', 'rancho cucamonga', 'riverside', 'san bernardino', 'ontario',
  'chino', 'pomona', 'palmdale', 'lancaster', 'oxnard', 'ventura', 'beverly hills',
  'culver city', 'manhattan beach', 'redondo beach', 'hermosa beach', 'el segundo',
  // SF Bay Area
  'san francisco', 'san jose', 'oakland', 'berkeley', 'palo alto', 'mountain view', 'sunnyvale', 'santa clara', 'fremont',
  'hayward', 'san mateo', 'redwood city', 'cupertino', 'menlo park', 'san rafael', 'walnut creek',
  'silicon valley', 'bay area', 'sf ', ' sfo',
  // Other major metros (non-exhaustive)
  'miami', 'tampa', 'orlando', 'jacksonville', 'fort lauderdale', 'tallahassee', 'st. petersburg', 'stpetersburg',
  'atlanta', 'savannah', 'nashville', 'memphis', 'knoxville', 'chattanooga',
  'chicago', 'evanston', 'naperville', 'aurora',
  'detroit', 'ann arbor', 'grand rapids',
  'phoenix', 'scottsdale', 'tucson', 'mesa',
  'denver', 'boulder', 'aurora',
  'dallas', 'houston', 'austin', 'san antonio', 'fort worth', 'plano', 'irving',
  'philadelphia', 'pittsburgh',
  'baltimore', 'bethesda', 'rockville',
  'charlotte', 'raleigh', 'durham', 'columbia',
  'columbus', 'cleveland', 'cincinnati', 'indianapolis',
  'milwaukee', 'madison',
  'minneapolis', 'st. paul', 'stpaul', 'saint paul',
  'kansas city', 'st. louis', 'stlouis', 'springfield',
  'las vegas', 'reno',
  'portland', 'eugene', 'bellevue', 'redmond',
  'salt lake city', 'provo',
  'honolulu',
  'anchorage',
  'boise',
  'little rock',
  'des moines',
  'omaha', 'lincoln',
  'oklahoma city', 'tulsa',
  'wichita',
  'birmingham', 'mobile',
  'jackson', 'biloxi',
  'fargo', 'bismarck',
  'sioux falls', 'rapid city',
  'cheyenne', 'casper',
  'billings', 'missoula',
  'albuquerque', 'santa fe',
  'wilmington', 'dover',
  'hartford', 'new haven', 'stamford',
  'providence', 'warwick',
  'burlington', 'montpelier',
  'manchester', 'concord',
  'portland me',
  'charleston', 'greenville',
  'asheville', 'greensboro', 'winston-salem', 'winston salem',
  'lexington', 'louisville', 'bowling green',
  'richmond', 'norfolk', 'virginia beach', 'newport news',
  'spokane', 'tacoma', 'everett',
  'sacramento', 'fresno', 'san diego', 'santa barbara', 'monterey',
]

const CANADA_HINTS = [
  'canada', 'toronto', 'vancouver', 'montreal', 'montréal', 'calgary', 'ottawa', 'edmonton', 'winnipeg',
  'quebec', 'québec', 'victoria bc', 'halifax', 'mississauga', 'waterloo', 'kitchener',
]

function normalizeLocation(raw: string): string {
  return raw.toLowerCase().trim()
}

/** Trailing ", CA" / ", NY" style (common US address form) */
function hasTrailingUsStateCode(raw: string): boolean {
  const m = raw.match(/,\s*([A-Za-z]{2})\s*$/)
  if (!m) return false
  return US_STATE_CODES.has(m[1].toUpperCase())
}

function hasUsStateName(s: string): boolean {
  for (const name of US_STATE_NAMES_DESC) {
    if (s.includes(name)) return true
  }
  return false
}

function hasUsLocalityHint(s: string): boolean {
  for (const hint of US_LOCALITY_HINTS) {
    if (s.includes(hint)) return true
  }
  return false
}

export function founderLocationLikelyUnitedStates(raw: string): boolean {
  const s = normalizeLocation(raw)
  if (!s) return false
  if (/\bunited states\b|\bu\.s\.a\.?\b|\busa\b/.test(s)) return true
  if (hasTrailingUsStateCode(raw)) return true
  if (hasUsStateName(s)) return true
  if (hasUsLocalityHint(s)) return true
  return false
}

export function founderLocationLikelyCanada(raw: string): boolean {
  const s = normalizeLocation(raw)
  if (!s) return false
  return CANADA_HINTS.some(h => s.includes(h))
}

/**
 * Investor geo strings imply US focus (not substring "us" inside "Australia").
 */
export function investorGeoTargetsUnitedStates(geo: string[]): boolean {
  for (const g of geo) {
    const t = g.toLowerCase().trim()
    if (!t) continue
    if (t === 'us' || t === 'u.s.' || t === 'u.s.a.' || t === 'usa') return true
    if (t === 'united states' || t.startsWith('united states')) return true
    if (t.includes('united states')) return true
    if (US_STATE_CODES.has(t.toUpperCase())) return true
    for (const name of US_STATE_NAMES_DESC) {
      if (t.includes(name)) return true
    }
  }
  return false
}

export function investorGeoTargetsNorthAmerica(geo: string[]): boolean {
  for (const g of geo) {
    const t = g.toLowerCase().trim()
    if (t.includes('north america')) return true
  }
  return false
}

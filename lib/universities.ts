// Minimal university directory for validation. Extend as needed.

const RAW_UNIVERSITIES = [
  'Stanford University',
  'Harvard University',
  'Massachusetts Institute of Technology',
  'MIT',
  'University of California, Berkeley',
  'UC Berkeley',
  'University of California, Los Angeles',
  'UCLA',
  'University of Pennsylvania',
  'Princeton University',
  'Yale University',
  'Columbia University',
  'Cornell University',
  'Brown University',
  'Dartmouth College',
  'University of Chicago',
  'Northwestern University',
  'Duke University',
  'Carnegie Mellon University',
  'New York University',
  'University of Michigan',
  'Georgia Institute of Technology',
  'California Institute of Technology',
  'Caltech',
  'University of Texas at Austin',
  'UT Austin',
  'University of Washington',
  'University of Illinois Urbana-Champaign',
  'UIUC',
  'Purdue University',
  'University of Waterloo',
  'Imperial College London',
  'University of Oxford',
  'University of Cambridge',
  'National University of Singapore',
  'Nanyang Technological University',
  'ETH Zurich',
  'EPFL',
  'Tsinghua University',
  'Peking University',
  'The University of Tokyo',
  'Seoul National University',
  'Tel Aviv University',
  'Technion – Israel Institute of Technology',
  'Indian Institute of Technology Bombay',
  'IIT Bombay',
  'Indian Institute of Technology Delhi',
  'IIT Delhi',
]

const ALIASES: Record<string, string> = {
  'mit': 'massachusetts institute of technology',
  'uc berkeley': 'university of california berkeley',
  'ucla': 'university of california los angeles',
  'caltech': 'california institute of technology',
  'uiuc': 'university of illinois urbana champaign',
  'ut austin': 'university of texas at austin',
  'epfl': 'epfl', // keep as-is
}

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[.,’'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const NORMALIZED_SET: Set<string> = new Set(
  RAW_UNIVERSITIES.map(u => normalize(u).replace(/-/g, ' '))
)

export function isKnownUniversity(name: string | undefined | null): boolean {
  if (!name) return false
  const n = normalize(name).replace(/-/g, ' ')
  if (NORMALIZED_SET.has(n)) return true
  const alias = ALIASES[n]
  if (alias && NORMALIZED_SET.has(alias)) return true
  // Common pattern: "University of X" vs "X University" → accept either ordering if both parts present
  if (n.includes(' university')) {
    const flipped = n.replace(' university', '')
    if (NORMALIZED_SET.has(`university of ${flipped}`)) return true
  }
  if (n.startsWith('university of ')) {
    const rest = n.replace('university of ', '')
    if (NORMALIZED_SET.has(`${rest} university`)) return true
  }
  // Looser heuristics: accept typical higher-ed keywords and common abbreviations.
  // This reduces false negatives for valid entries like "UC Berkeley", "U of T", etc.
  const genericKeywords = ['university', 'college', 'institute', 'polytechnic', 'school of', 'uni ']
  if (genericKeywords.some(k => n.includes(k))) return true
  // Common abbreviations (word boundary)
  if (/\b(uc|u\.c\.|univ|u of)\b/.test(n)) return true
  // Known campus shortnames
  const shortnames = ['berkeley', 'waterloo', 'oxford', 'cambridge', 'caltech', 'mit', 'ucla', 'uiuc', 'epfl', 'eth']
  if (shortnames.some(s => n.includes(s))) return true
  return false
}

// Provide a list for UI suggestions (non-exhaustive; for convenience only)
export const SUGGESTED_UNIVERSITIES: string[] = RAW_UNIVERSITIES



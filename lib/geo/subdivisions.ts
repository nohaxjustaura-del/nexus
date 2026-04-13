/**
 * First-class subdivisions (states / provinces / territories) for structured founder geo.
 * Countries not listed here do not require a region code; matching falls back to city + country.
 */

export type Subdivision = { code: string; name: string }

function pairs(lines: string): Subdivision[] {
  return lines
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf(',')
      const code = line.slice(0, i).trim().toUpperCase()
      const name = line.slice(i + 1).trim()
      return { code, name }
    })
}

const US_LINES = `
AL,Alabama
AK,Alaska
AZ,Arizona
AR,Arkansas
CA,California
CO,Colorado
CT,Connecticut
DE,Delaware
DC,District of Columbia
FL,Florida
GA,Georgia
HI,Hawaii
ID,Idaho
IL,Illinois
IN,Indiana
IA,Iowa
KS,Kansas
KY,Kentucky
LA,Louisiana
ME,Maine
MD,Maryland
MA,Massachusetts
MI,Michigan
MN,Minnesota
MS,Mississippi
MO,Missouri
MT,Montana
NE,Nebraska
NV,Nevada
NH,New Hampshire
NJ,New Jersey
NM,New Mexico
NY,New York
NC,North Carolina
ND,North Dakota
OH,Ohio
OK,Oklahoma
OR,Oregon
PA,Pennsylvania
RI,Rhode Island
SC,South Carolina
SD,South Dakota
TN,Tennessee
TX,Texas
UT,Utah
VT,Vermont
VA,Virginia
WA,Washington
WV,West Virginia
WI,Wisconsin
WY,Wyoming
`

const CA_LINES = `
AB,Alberta
BC,British Columbia
MB,Manitoba
NB,New Brunswick
NL,Newfoundland and Labrador
NS,Nova Scotia
NT,Northwest Territories
NU,Nunavut
ON,Ontario
PE,Prince Edward Island
QC,Quebec
SK,Saskatchewan
YT,Yukon
`

const AU_LINES = `
ACT,Australian Capital Territory
NSW,New South Wales
NT,Northern Territory
QLD,Queensland
SA,South Australia
TAS,Tasmania
VIC,Victoria
WA,Western Australia
`

/** UK constituent countries (commonly used for founder HQ). */
const GB_LINES = `
ENG,England
NIR,Northern Ireland
SCT,Scotland
WLS,Wales
`

const SUBDIVISIONS_BY_COUNTRY: Record<string, Subdivision[]> = {
  US: pairs(US_LINES),
  CA: pairs(CA_LINES),
  AU: pairs(AU_LINES),
  GB: pairs(GB_LINES),
}

const SUBDIVISION_INDEX: Map<string, Map<string, string>> = new Map()
for (const [cc, list] of Object.entries(SUBDIVISIONS_BY_COUNTRY)) {
  const m = new Map<string, string>()
  for (const { code, name } of list) {
    m.set(code.toUpperCase(), name)
  }
  SUBDIVISION_INDEX.set(cc.toUpperCase(), m)
}

export function countryHasSubdivisionList(countryCode: string | null | undefined): boolean {
  if (!countryCode) return false
  const list = SUBDIVISIONS_BY_COUNTRY[countryCode.toUpperCase()]
  return Boolean(list && list.length > 0)
}

export function getSubdivisionsForCountry(countryCode: string | null | undefined): Subdivision[] {
  if (!countryCode) return []
  return SUBDIVISIONS_BY_COUNTRY[countryCode.toUpperCase()] ?? []
}

export function getSubdivisionName(countryCode: string | null | undefined, regionCode: string | null | undefined): string | undefined {
  if (!countryCode || !regionCode) return undefined
  const m = SUBDIVISION_INDEX.get(countryCode.toUpperCase())
  if (!m) return undefined
  return m.get(regionCode.trim().toUpperCase())
}

export function isValidSubdivisionForCountry(
  countryCode: string | null | undefined,
  regionCode: string | null | undefined,
): boolean {
  if (!countryCode) return false
  const cc = countryCode.toUpperCase()
  const list = SUBDIVISIONS_BY_COUNTRY[cc]
  if (!list || list.length === 0) return true
  if (!regionCode?.trim()) return false
  const rc = regionCode.trim().toUpperCase()
  return list.some((s) => s.code.toUpperCase() === rc)
}

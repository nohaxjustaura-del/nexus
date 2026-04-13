import { getCountryByCode } from '@/lib/geo/iso3166-countries'
import { getSubdivisionName } from '@/lib/geo/subdivisions'

export type FounderGeoParts = {
  /** City or locality (stored in Founder.location). */
  city: string | null | undefined
  countryCode?: string | null
  regionCode?: string | null
}

/**
 * Human-readable HQ line for investors and emails (e.g. "Cerritos, California, United States").
 */
export function formatFounderLocationLine(parts: FounderGeoParts): string {
  const city = parts.city?.trim() || ''
  const cc = parts.countryCode?.trim().toUpperCase() || ''
  const rc = parts.regionCode?.trim() || ''
  const countryName = getCountryByCode(cc)?.name || ''
  const subName = getSubdivisionName(cc, rc) || (rc ? rc : '')

  const bits: string[] = []
  if (city) bits.push(city)
  if (subName) bits.push(subName)
  if (countryName) bits.push(countryName)

  if (bits.length > 0) return bits.join(', ')
  return city
}

/**
 * Lowercased string bundle for fuzzy geography overlap (investor tokens vs founder HQ).
 */
export function buildFounderGeoMatchText(parts: FounderGeoParts): string {
  const line = formatFounderLocationLine(parts)
  const cc = parts.countryCode?.trim().toUpperCase() || ''
  const rc = parts.regionCode?.trim().toUpperCase() || ''
  const countryName = getCountryByCode(cc)?.name?.toLowerCase() || ''
  const extras = [line, cc, rc, countryName].filter(Boolean).join(' ').toLowerCase()
  return extras
}

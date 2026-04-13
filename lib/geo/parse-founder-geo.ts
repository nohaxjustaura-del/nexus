import { getCountryByCode } from '@/lib/geo/iso3166-countries'
import { countryHasSubdivisionList, isValidSubdivisionForCountry } from '@/lib/geo/subdivisions'

export type ParsedFounderGeo =
  | { ok: true; countryCode: string; regionCode: string | null }
  | { ok: false; message: string }

export function parseFounderGeoRequest(data: {
  countryCode?: unknown
  regionCode?: unknown
}): ParsedFounderGeo {
  const ccRaw = data.countryCode
  const cc = ccRaw != null && String(ccRaw).trim() ? String(ccRaw).trim().toUpperCase() : ''
  if (!cc) return { ok: false, message: 'Country is required' }
  if (!getCountryByCode(cc)) return { ok: false, message: 'Unknown country code' }

  const rcRaw = data.regionCode
  const rc = rcRaw != null && String(rcRaw).trim() ? String(rcRaw).trim().toUpperCase() : ''

  if (countryHasSubdivisionList(cc)) {
    if (!isValidSubdivisionForCountry(cc, rc)) {
      return { ok: false, message: 'Please choose a valid state or province for the selected country' }
    }
    return { ok: true, countryCode: cc, regionCode: rc }
  }

  return { ok: true, countryCode: cc, regionCode: null }
}

/** Public product name (UI, email, metadata). */
export const BRAND_NAME = 'NEXUS'

/** Short tagline (sentence case) for subtitles and descriptions. */
export const BRAND_TAGLINE = 'Fundraising match engine for founders'

/** Home hero eyebrow (uppercase styling in UI). Must stay SSR/CSR-identical to avoid hydration mismatches. */
export const BRAND_HERO_EYEBROW = 'Fundraising match engine'

/** Default browser tab / Open Graph title. */
export const BRAND_DEFAULT_TITLE = `${BRAND_NAME} · ${BRAND_TAGLINE}`

/** `generateMetadata` title template: "Page | NEXUS" */
export const BRAND_TITLE_TEMPLATE = `%s | ${BRAND_NAME}`

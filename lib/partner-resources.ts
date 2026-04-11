/** Keys for Ask/Book modal routing (partner-specific founders). */
export type ResourcePartnerFounderKey = 'william' | 'inigo'

export type PartnerFounderPreview = {
  name: string
  imageSrc: string
  imageAlt: string
  /** One-line role line (shown under name) */
  roleLine: string
  tag: string
  founderKey: ResourcePartnerFounderKey
  linkedInUrl: string
}

export type ResourcePartner = {
  slug: string
  name: string
  /** One line for badges (e.g. YC W26) */
  listSummary: string
  /** Legacy directory line; index uses founders + companyIntro visually */
  listDetail: string
  /** Short paragraph: what the company does and what visitors get on this hub */
  companyIntro: string
  /** One line under the intro (resources focus) */
  resourcesTagline: string
  heroTitle: string
  heroSubtitleBeforePremium: string
  heroSubtitleAfterPremium: string
  foundersPreview: PartnerFounderPreview[]
}

/** Directory + detail pages for /founder/network and /founder/network/[slug] */
export const RESOURCE_PARTNERS: ResourcePartner[] = [
  {
    slug: 'luel',
    name: 'Luel',
    listSummary: 'YC W26',
    listDetail:
      'William Namgyal (CEO) and Inigo Lenderking (COO), YC W26 - rights-cleared multimodal training data; playbooks and founder access on this hub.',
    companyIntro:
      'Luel turns everyday words and actions into usable training data: a rights-cleared marketplace and collection engine for multimodal datasets. Frontier AI teams request data to spec; Luel mobilizes a global contributor network and delivers licensed, audit-ready collections fast. Y Combinator Winter 2026.',
    resourcesTagline:
      'This hub: application teardowns, deck autopsies, interview prep, and Ask / Book with the founders (Premium).',
    heroTitle: 'Luel',
    heroSubtitleBeforePremium: 'Meet the founders and get ',
    heroSubtitleAfterPremium: ' to ask them any question or book meetings with them.',
    foundersPreview: [
      {
        name: 'William Namgyal',
        imageSrc: '/yc-insider/william-namgyal.png',
        imageAlt: 'William Namgyal',
        roleLine: 'Co-Founder & CEO, Luel (YC W26). Berkeley M.E.T. dropout.',
        tag: 'Product + Strategy',
        founderKey: 'william',
        linkedInUrl: 'https://www.linkedin.com/in/william-namgyal/',
      },
      {
        name: 'Inigo Lenderking',
        imageSrc: '/yc-insider/inigo-lenderking.png',
        imageAlt: 'Inigo Lenderking',
        roleLine: 'Co-Founder & COO, Luel (YC W26). Berkeley dropout.',
        tag: 'COO + Operations',
        founderKey: 'inigo',
        linkedInUrl: 'https://www.linkedin.com/in/inigolenderking/',
      },
    ],
  },
]

export function getResourcePartner(slug: string): ResourcePartner | undefined {
  return RESOURCE_PARTNERS.find((p) => p.slug === slug)
}

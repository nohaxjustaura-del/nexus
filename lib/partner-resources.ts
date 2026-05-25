/** Keys for Ask/Book modal routing (partner-specific founders). */
export type ResourcePartnerFounderKey = 'william' | 'inigo'

export type PartnerFounderPreview = {
  name: string
  imageSrc: string
  imageAlt: string
  /** One-line role line (shown under name) */
  roleLine: string
  tag: string
  /** When set, Ask / Book routes to the legacy YC insider founder request flow. */
  founderKey?: ResourcePartnerFounderKey
  linkedInUrl?: string
  /** E.164 or formatted phone for advisor-style hubs */
  phone?: string
  locationLine?: string
  /**
   * Calendly scheduling URL for this contact.
   * When set, the "Book" button uses the CalendarBooking flow
   * (pre-booking form → Calendly popup) instead of the legacy text modal.
   * Must be a real Calendly URL before deploying to production.
   */
  calendlyUrl?: string
}

/** Used to group cards on /founder/network and /investor/network */
export type ResourcePartnerNetworkSection = 'founder-company' | 'venture-capital' | 'ma-brokerage'

export const NETWORK_SECTION_ORDER: ResourcePartnerNetworkSection[] = [
  'founder-company',
  'venture-capital',
  'ma-brokerage',
]

export const NETWORK_SECTION_LABEL: Record<
  ResourcePartnerNetworkSection,
  { title: string; description: string }
> = {
  'founder-company': {
    title: 'Founder & company hubs',
    description: 'YC teams, playbooks, and optional Ask / Book with founders.',
  },
  'venture-capital': {
    title: 'Venture capital',
    description:
      'LPs and venture partners: deal flow and firm-side intros for founders, separate from M&A brokers.',
  },
  'ma-brokerage': {
    title: 'M&A & business brokerage',
    description: 'Buy-side, sell-side, and exit planning with Transworld (Los Angeles).',
  },
}

export type ResourcePartner = {
  slug: string
  name: string
  networkSection: ResourcePartnerNetworkSection
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
  /** When set, replaces the Premium split subtitle (used for non-YC partner hubs). */
  heroSubtitlePlain?: string
  foundersPreview: PartnerFounderPreview[]
  /** Default true (YC-style playbooks + credits). False = directory / advisor contact hub only. */
  showYcPlaybookModules?: boolean
  /** Primary site for the partner organization (advisor hubs). */
  partnerSiteUrl?: string
  /** Replaces the default "Firm website" label on advisor hubs when set. */
  partnerSiteLabel?: string
  /** Extra org links (e.g. a second fund or program) shown next to the primary site button. */
  extraPartnerLinks?: { label: string; href: string }[]
  /**
   * Optional second card on the hub, e.g. M&A & brokerage when the main profile is venture; keeps
   * narratives from blending (Calvin’s desk vs Jonathan’s VC work).
   */
  secondaryHub?: { title: string; description: string; ctaLabel: string; ctaHref: string }
}

/** Directory + detail pages for /founder/network and /founder/network/[slug] */
export const RESOURCE_PARTNERS: ResourcePartner[] = [
  {
    slug: 'luel',
    name: 'Luel',
    networkSection: 'founder-company',
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
        calendlyUrl: 'https://calendly.com/kelvinw-berkeley/luel',
      },
      {
        name: 'Inigo Lenderking',
        imageSrc: '/yc-insider/inigo-lenderking.png',
        imageAlt: 'Inigo Lenderking',
        roleLine: 'Co-Founder & COO, Luel (YC W26). Berkeley dropout.',
        tag: 'COO + Operations',
        founderKey: 'inigo',
        linkedInUrl: 'https://www.linkedin.com/in/inigolenderking/',
        calendlyUrl: 'https://calendly.com/kelvinw-berkeley/luel',
      },
    ],
  },
  {
    slug: 'transworld',
    name: 'Transworld Business Advisors',
    networkSection: 'ma-brokerage',
    listSummary: 'M&A · brokerage',
    listDetail:
      'Calvin Tampubolon handles buy-side and sell-side brokerage, M&A, and exit planning with Transworld in Los Angeles.',
    companyIntro:
      'Transworld helps people buy and sell businesses with brokers who have been through the process many times, from a quiet first conversation through closing. Calvin runs the Los Angeles office. Whether you want to sell, buy, or map out an exit, you work with him directly.',
    resourcesTagline:
      'Call Calvin, open the firm site, or reach him on LinkedIn when you want to take a next step.',
    heroTitle: 'Transworld × Nexus',
    heroSubtitleBeforePremium: '',
    heroSubtitleAfterPremium: '',
    heroSubtitlePlain:
      'Los Angeles-based Transworld desk for acquisitions, divestitures, and exit consulting. One call gets you to the right broker.',
    showYcPlaybookModules: false,
    partnerSiteUrl: 'https://www.tworld.com/',
    foundersPreview: [
      {
        name: 'Calvin Tampubolon',
        imageSrc: '/network-partners/calvin-tampubolon.png',
        imageAlt: 'Calvin Tampubolon',
        roleLine:
          'Managing Partner. Business brokerage, M&A, and exit consulting; franchise owner; board member.',
        tag: 'Los Angeles metro',
        phone: '(800) 205-7605',
        locationLine: 'Los Angeles metropolitan area',
        calendlyUrl: 'https://calendly.com/kelvinw-berkeley/transworld-business-advisors',
      },
    ],
  },
  {
    slug: 'jonathan-cheung',
    name: 'Jonathan Cheung, CFA',
    networkSection: 'venture-capital',
    listSummary: 'Tunitas · GoingVC',
    listDetail:
      'LP at Tunitas Ventures and Venture Partner at GoingVC Partners, focused on early-stage and strategic venture work in California.',
    companyIntro:
      'This hub is for Jonathan’s venture work. He is a Limited Partner with Tunitas Ventures and a Venture Partner with GoingVC Partners, with attention to deal flow, diligence, and practical intros for founders. His Transworld M&A and brokerage practice is a different lane: you will find it in the second card on this page. Calvin’s Transworld Los Angeles desk has its own hub in the directory.',
    resourcesTagline: 'Start on LinkedIn, or open Tunitas and GoingVC in the links below when you want firm context first.',
    heroTitle: 'Jonathan Cheung, CFA',
    heroSubtitleBeforePremium: '',
    heroSubtitleAfterPremium: '',
    heroSubtitlePlain: 'Venture: Tunitas LP and GoingVC Venture Partner. Use the links for firm context, LinkedIn to say hi.',
    showYcPlaybookModules: false,
    partnerSiteUrl: 'https://www.tunitas.vc/',
    partnerSiteLabel: 'Tunitas Ventures',
    extraPartnerLinks: [
      { label: 'GoingVC Partners', href: 'https://www.goingvc.com/goingvc-partners' },
    ],
    secondaryHub: {
      title: 'M&A & business brokerage',
      description:
        'Jonathan also works with Transworld on mid-market business sales and acquisitions in Southern California. That work sits apart from his venture role on this page, and it is not the same office as the Los Angeles Transworld hub in our network (Calvin’s card).',
      ctaLabel: 'Transworld profile (brokerage)',
      ctaHref: 'https://www.transworldma.com/team/jonathan-cheung/',
    },
    foundersPreview: [
      {
        name: 'Jonathan Cheung, CFA',
        imageSrc: '/network-partners/jonathan-cheung.png',
        imageAlt: 'Jonathan Cheung, CFA',
        roleLine:
          'Limited Partner at Tunitas Ventures and Venture Partner at GoingVC Partners. Orange County and Los Angeles.',
        tag: 'Venture · SoCal',
        locationLine: 'Orange County & Los Angeles, California',
        linkedInUrl: 'https://www.linkedin.com/in/jonathan-cheung-cfa/',
        calendlyUrl: 'https://calendly.com/kelvinw-berkeley/jon',
      },
    ],
  },
]

export function getResourcePartnersByNetworkSection() {
  return NETWORK_SECTION_ORDER.map((section) => ({
    section,
    label: NETWORK_SECTION_LABEL[section],
    partners: RESOURCE_PARTNERS.filter((p) => p.networkSection === section),
  })).filter((g) => g.partners.length > 0)
}

export function getResourcePartner(slug: string): ResourcePartner | undefined {
  return RESOURCE_PARTNERS.find((p) => p.slug === slug)
}

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
  /** Contact email for advisor-style hubs */
  email?: string
  /** Shown near the email button on advisor hubs */
  emailNote?: string
  /** Prefilled mailto subject when email is set */
  emailSubject?: string
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
  /** Prominent note on advisor hubs (e.g. investor eligibility). */
  eligibilityNote?: string
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
  {
    slug: 'harris-stolzenberg',
    name: 'Harris Stolzenberg',
    networkSection: 'venture-capital',
    listSummary: 'Pear VC',
    listDetail:
      'Partner at Pear VC, leading the firm’s East Coast expansion from Boston. Pre-seed and seed investing plus PearX.',
    companyIntro:
      'Harris is a Partner at Pear VC, focused on making Pear the go-to early-stage firm on the East Coast, starting in Boston. He backs founders at the idea and pre-seed stage through Pear’s investing and PearX accelerator. Previously Chief of Staff at Pillar VC; before that he co-founded and sold a venture-backed travel startup. MIT alum.',
    resourcesTagline:
      'Email Harris a short blurb and your deck. Mention you were referred by NEXUS and he will get back to you.',
    heroTitle: 'Harris Stolzenberg',
    heroSubtitleBeforePremium: '',
    heroSubtitleAfterPremium: '',
    heroSubtitlePlain:
      'Partner at Pear VC in Boston. Send a short blurb and deck, and say you were referred by NEXUS.',
    showYcPlaybookModules: false,
    partnerSiteUrl: 'https://pear.vc/',
    partnerSiteLabel: 'Pear VC',
    extraPartnerLinks: [{ label: 'PearX', href: 'https://pear.vc/pearx/' }],
    foundersPreview: [
      {
        name: 'Harris Stolzenberg',
        imageSrc: '/network-partners/harris-stolzenberg.png',
        imageAlt: 'Harris Stolzenberg',
        roleLine: 'Partner at Pear VC. Leads East Coast expansion from Boston.',
        tag: 'Venture · Boston',
        locationLine: 'Boston, Massachusetts',
        email: 'harris@pear.vc',
        emailSubject: 'Referred by NEXUS',
        emailNote:
          'When emailing, say you were referred by NEXUS. Send a short blurb and your deck. Harris will get back to you.',
        linkedInUrl: 'https://www.linkedin.com/in/harris-stolzenberg/',
      },
    ],
  },
  {
    slug: 'iynna-halilou',
    name: 'Iynna Halilou',
    networkSection: 'venture-capital',
    listSummary: 'The MBA Fund',
    listDetail:
      'General Partner at The MBA Fund. Pre-seed and seed in founders from Harvard, Stanford, Wharton, and Berkeley.',
    companyIntro:
      'Iynna is a General Partner at The MBA Fund, backing high-potential founders from top startup ecosystems at pre-seed and seed, often before institutional capital enters the round. The fund has backed 180+ companies since 2018. Previously first hire at Moxxie Ventures; started her career at the UN. Wharton, NYU, and Durham alumna. Based between New York and Paris.',
    resourcesTagline: 'Connect on LinkedIn or visit The MBA Fund below.',
    heroTitle: 'Iynna Halilou',
    heroSubtitleBeforePremium: '',
    heroSubtitleAfterPremium: '',
    heroSubtitlePlain:
      'General Partner at The MBA Fund. Pre-seed and seed in founders from leading MBA startup ecosystems.',
    showYcPlaybookModules: false,
    partnerSiteUrl: 'https://www.thembafund.com/',
    partnerSiteLabel: 'The MBA Fund',
    foundersPreview: [
      {
        name: 'Iynna Halilou',
        imageSrc: '/network-partners/iynna-halilou.png',
        imageAlt: 'Iynna Halilou',
        roleLine: 'General Partner at The MBA Fund. Pre-seed and seed investor.',
        tag: 'Venture · NY & Paris',
        locationLine: 'New York & Paris',
        linkedInUrl: 'https://www.linkedin.com/in/iynnahalilou/',
      },
    ],
  },
  {
    slug: 'andrew-straiton',
    name: 'Andrew Straiton',
    networkSection: 'venture-capital',
    listSummary: 'OSE · Deep Tech',
    listDetail:
      'Deep Tech investor at Oxford Science Enterprises. Physical sciences and engineering. Oxford-linked founders only.',
    companyIntro:
      'Andrew is an Investment Associate on the Deep Tech team at Oxford Science Enterprises (OSE), investing across physical sciences and engineering to translate world-class research into businesses. Focus on deep tech with particular interests in energy and industrials. PhD in applied inorganic materials chemistry (University of Bath); former Bain consultant. Based in London.',
    eligibilityNote:
      'Andrew only invests in founders with an Oxford link: University of Oxford researchers, spinouts, or Oxford-connected teams.',
    resourcesTagline: 'Oxford-linked founders: connect on LinkedIn or visit OSE below.',
    heroTitle: 'Andrew Straiton',
    heroSubtitleBeforePremium: '',
    heroSubtitleAfterPremium: '',
    heroSubtitlePlain:
      'Deep Tech investor at Oxford Science Enterprises. Oxford-linked founders only.',
    showYcPlaybookModules: false,
    partnerSiteUrl: 'https://www.oxfordscienceenterprises.com/',
    partnerSiteLabel: 'Oxford Science Enterprises',
    foundersPreview: [
      {
        name: 'Andrew Straiton',
        imageSrc: '/network-partners/andrew-straiton.png',
        imageAlt: 'Andrew Straiton',
        roleLine: 'Deep Tech VC Investor at Oxford Science Enterprises. PhD chemist.',
        tag: 'Deep Tech · London',
        locationLine: 'London, England',
        linkedInUrl: 'https://www.linkedin.com/in/andrew-straiton/',
      },
    ],
  },
  {
    slug: 'daniella-cohen',
    name: 'Daniella Cohen',
    networkSection: 'venture-capital',
    listSummary: '2048 Ventures',
    listDetail:
      'Principal at 2048 Ventures. Pre-seed and seed in health, biotech, vertical AI, and deep tech in NYC and Boston.',
    companyIntro:
      'Daniella is a Principal at 2048 Ventures, where she invests in health with a focus on healthcare, biotech, vertical AI, and deep tech. The firm leads pre-seed and seed rounds with $500K to $3M checks, primarily in NYC and Boston. Previously managing partner at Rough Draft Ventures. Princeton neuroscience alum.',
    resourcesTagline:
      'Email a short blurb and deck. Mention you were referred by NEXUS, or use her pitch form below.',
    heroTitle: 'Daniella Cohen',
    heroSubtitleBeforePremium: '',
    heroSubtitleAfterPremium: '',
    heroSubtitlePlain:
      'Principal at 2048 Ventures. Health, biotech, and deep tech. Email or pitch and say you were referred by NEXUS.',
    showYcPlaybookModules: false,
    partnerSiteUrl: 'https://www.2048.vc/',
    partnerSiteLabel: '2048 Ventures',
    extraPartnerLinks: [{ label: 'Pitch Daniella', href: 'https://2048.vc/pitch-daniella' }],
    foundersPreview: [
      {
        name: 'Daniella Cohen',
        imageSrc: '/network-partners/daniella-cohen.webp',
        imageAlt: 'Daniella Cohen',
        roleLine: 'Principal at 2048 Ventures. Investing in health, biotech, and deep tech.',
        tag: 'Health · NYC',
        locationLine: 'New York, New York',
        email: 'daniella@2048.vc',
        emailSubject: 'Referred by NEXUS',
        emailNote:
          'When emailing, say you were referred by NEXUS. Send a short blurb and your deck. Daniella will get back to you. You can also use the pitch form.',
        linkedInUrl: 'https://www.linkedin.com/in/daniellacohen/',
      },
    ],
  },
  {
    slug: 'madison-jacox',
    name: 'Madison Jacox',
    networkSection: 'venture-capital',
    listSummary: 'Dorm Room Fund',
    listDetail:
      'Principal at Dorm Room Fund. Pre-seed in student and recent alumni founders (undergrad, MBA, and PhD).',
    companyIntro:
      'Madison is a Principal at Dorm Room Fund, a First Round Capital spin-out and the leading student-run VC fund. She backs the strongest student and recent alumni founders at the earliest stage, with a focus on pre-seed blocking and tackling. Previously founding team at Sidebar and investor / chief of staff at Hangar. Columbia SIPA alum.',
    eligibilityNote:
      'Dorm Room Fund invests in startups founded by current students or recent alumni (undergraduate, MBA, or PhD). U.S.-incorporated companies.',
    resourcesTagline:
      'Email a short blurb and deck. Mention you were referred by NEXUS, or apply through Dorm Room Fund below.',
    heroTitle: 'Madison Jacox',
    heroSubtitleBeforePremium: '',
    heroSubtitleAfterPremium: '',
    heroSubtitlePlain:
      'Principal at Dorm Room Fund. For student and recent alumni founders. Email or apply and say you were referred by NEXUS.',
    showYcPlaybookModules: false,
    partnerSiteUrl: 'https://www.dormroomfund.com/',
    partnerSiteLabel: 'Dorm Room Fund',
    extraPartnerLinks: [{ label: 'Apply for funding', href: 'https://www.dormroomfund.com/apply' }],
    foundersPreview: [
      {
        name: 'Madison Jacox',
        imageSrc: '/network-partners/madison-jacox.png',
        imageAlt: 'Madison Jacox',
        roleLine: 'Principal at Dorm Room Fund. Pre-seed investor for student founders.',
        tag: 'Student VC · US',
        locationLine: 'United States',
        email: 'madison@drf.vc',
        emailSubject: 'Referred by NEXUS',
        emailNote:
          'When emailing, say you were referred by NEXUS. Send a short blurb and your deck. Madison will get back to you. You can also apply on the DRF site.',
        linkedInUrl: 'https://www.linkedin.com/in/madison-jacox/',
      },
    ],
  },
  {
    slug: 'alexis-maciel',
    name: 'Alexis Zamira Maciel',
    networkSection: 'venture-capital',
    listSummary: 'Unshackled Ventures',
    listDetail:
      'Principal at Unshackled Ventures. Pre-seed first-check investor for immigrant founders building in the U.S.',
    companyIntro:
      'Alexis is a Principal at Unshackled Ventures, the first early-stage VC fund focused on immigrant founders. She backs them with capital, visa support, and community at pre-product, pre-traction, and pre-revenue. Previously at Max Borges Agency. Based in San Francisco.',
    eligibilityNote:
      'Unshackled Ventures invests in immigrant founders building companies in the U.S., often as the first check, with immigration legal support.',
    resourcesTagline:
      'Email a short blurb and deck. Mention you were referred by NEXUS, or pitch through Unshackled below.',
    heroTitle: 'Alexis Zamira Maciel',
    heroSubtitleBeforePremium: '',
    heroSubtitleAfterPremium: '',
    heroSubtitlePlain:
      'Principal at Unshackled Ventures. For immigrant founders. Email or pitch and say you were referred by NEXUS.',
    showYcPlaybookModules: false,
    partnerSiteUrl: 'https://www.unshackledvc.com/',
    partnerSiteLabel: 'Unshackled Ventures',
    extraPartnerLinks: [{ label: 'Pitch Unshackled', href: 'https://www.unshackledvc.com/eighteen150' }],
    foundersPreview: [
      {
        name: 'Alexis Zamira Maciel',
        imageSrc: '/network-partners/alexis-maciel.png',
        imageAlt: 'Alexis Zamira Maciel',
        roleLine: 'Principal at Unshackled Ventures. Unlocking immigrant ambition.',
        tag: 'Immigrant founders · SF',
        locationLine: 'San Francisco, California',
        email: 'alexis@unshackledvc.com',
        emailSubject: 'Referred by NEXUS',
        emailNote:
          'When emailing, say you were referred by NEXUS. Send a short blurb and your deck. Alexis will get back to you. You can also use the pitch form.',
        linkedInUrl: 'https://www.linkedin.com/in/alexiszamiramaciel-398644144/',
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

import { PrismaClient } from '@prisma/client'
import { eliteVCs } from './elite-vcs-seed'
import { comprehensiveVCs } from './comprehensive-seed'

const prisma = new PrismaClient()

const SECTORS = [
  'AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'Climate Tech', 'Consumer',
  'Enterprise', 'Crypto/Web3', 'EdTech', 'DeepTech', 'Biotech', 'Hardware',
  'Marketplace', 'Developer Tools', 'Security', 'Infrastructure'
]

const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B']

const VALUE_ADDS = [
  'Hiring Support', 'Go-to-Market Strategy', 'Product Feedback',
  'Industry Connections', 'Follow-on Funding', 'PR/Marketing',
  'Technical Mentorship', 'Sales Intros', 'Board Experience',
  'Recruiting Network', 'Customer Intros', 'International Expansion'
]

const US_REGIONS = ['San Francisco', 'New York', 'Global', 'US', 'Los Angeles', 'Boston', 'Austin']

const investors = [
  // Elite Tier: Top VC Firms
  {
    email: 'arc@sequoiacap.com',
    name: 'Sequoia Arc Team',
    firmName: 'Sequoia',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkMin: 500,
    checkMax: 3000,
    sectors: JSON.stringify(['AI/ML', 'SaaS', 'Enterprise', 'Consumer']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$9B+ AUM',
    fundType: 'institutional',
    thesis: 'PMF-oriented partnering. We probe for your PMF type (pull vs push vs network) and the true signals that match it. Founder quality + contrarian insight first; metrics as learning engine.',
    proofPoints: JSON.stringify({
      'All': ['PMF signals (retention, organic, network effects)', 'Contrarian insight validated', 'Clear wedge strategy', 'Learning velocity']
    }),
    portfolio: JSON.stringify([
      { name: 'Stripe', sector: 'Fintech', stage: 'Series A', outcome: '$95B valuation' },
      { name: 'DoorDash', sector: 'Consumer', stage: 'Series A', outcome: 'Public' }
    ]),
    ownershipTarget: '15-20% at Seed/A',
    valueAddTags: JSON.stringify(['PMF Guidance', 'Canonical Deck Framework', 'Arc Program']),
    ethicsTags: JSON.stringify(['Founder-first', 'Long-term']),
    personalityType: 'PMF-obsessed',
    decisionSpeed: '3-4 weeks',
    responsivenessScore: 92,
    applicationUrl: 'https://www.sequoiacap.com/apply',
  },
  {
    email: 'pitch@a16z.com',
    name: 'a16z Team',
    firmName: 'a16z',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Series B']),
    checkMin: 1000,
    checkMax: 15000,
    sectors: JSON.stringify(['AI/ML', 'Crypto/Web3', 'SaaS', 'Marketplace', 'Biotech']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$35B+ AUM',
    fundType: 'institutional',
    thesis: 'Deep category theses (marketplaces, applied AI, crypto). Process-savvy fundraising preferred. Fine with very early if thesis is strong. Mirror our language when framing your wedge.',
    proofPoints: JSON.stringify({
      'AI/ML': ['Applied AI differentiation', 'Not just API wrapper', 'Category-specific use case'],
      'Marketplace': ['Supply/demand dynamics', 'Network effects', 'Liquidity metrics'],
      'Crypto/Web3': ['On-chain traction', 'Token economics', 'Regulatory clarity']
    }),
    portfolio: JSON.stringify([
      { name: 'Coinbase', sector: 'Crypto', stage: 'Series A', outcome: 'Public' },
      { name: 'Instacart', sector: 'Marketplace', stage: 'Series A', outcome: 'Public' }
    ]),
    ownershipTarget: '15-20%',
    valueAddTags: JSON.stringify(['Category Expertise', 'Network', 'Operational Playbooks']),
    ethicsTags: JSON.stringify(['Thesis-driven']),
    personalityType: 'process-oriented',
    decisionSpeed: '4-6 weeks',
    responsivenessScore: 88,
    applicationUrl: 'https://a16z.com/about/submit-pitch',
  },
  {
    email: 'team@firstround.com',
    name: 'First Round Team',
    firmName: 'First Round',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkMin: 500,
    checkMax: 3000,
    sectors: JSON.stringify(['SaaS', 'AI/ML', 'Enterprise', 'Consumer', 'Developer Tools']),
    geoFocus: JSON.stringify(['US']),
    leadFollow: 'lead',
    fundSize: '$1.5B AUM',
    fundType: 'institutional',
    thesis: 'Seed specialists focused on narrative clarity and partner-meeting readiness. Why this team sees something others don\'t. Practical fundraising craft from hundreds of seed processes.',
    proofPoints: JSON.stringify({
      'All': ['Narrative clarity', 'Team unique advantage', 'Partner-ready materials', 'Clear "why us, why now"']
    }),
    portfolio: JSON.stringify([
      { name: 'Uber', sector: 'Consumer', stage: 'Seed', outcome: 'Public' },
      { name: 'Square', sector: 'Fintech', stage: 'Seed', outcome: 'Public' }
    ]),
    ownershipTarget: '10-15% at Seed',
    valueAddTags: JSON.stringify(['Seed Expertise', 'Fundraising Checklists', 'Network']),
    ethicsTags: JSON.stringify(['Founder-friendly', 'Seed-focused']),
    personalityType: 'narrative-focused',
    decisionSpeed: '3-4 weeks',
    responsivenessScore: 90,
    applicationUrl: 'https://firstround.com/companies/apply',
  },
  {
    email: 'contact@greylock.com',
    name: 'Greylock Team',
    firmName: 'Greylock',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed', 'Series A']),
    checkMin: 500,
    checkMax: 10000,
    sectors: JSON.stringify(['AI/ML', 'SaaS', 'Enterprise', 'Consumer']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$2B+ Fund',
    fundType: 'institutional',
    thesis: 'Very early (often first check) with strong AI-first bias. Hands-on company-building via Greylock Edge. "Partner from day one" - we help build, not just fund.',
    proofPoints: JSON.stringify({
      'AI/ML': ['AI-native approach', 'Company-building needs', 'Partnership mindset', 'Edge program fit']
    }),
    portfolio: JSON.stringify([
      { name: 'LinkedIn', sector: 'Consumer', stage: 'Series A', outcome: 'Acquired $26B' },
      { name: 'Discord', sector: 'Consumer', stage: 'Series A', outcome: 'Active' }
    ]),
    ownershipTarget: '15-20%',
    valueAddTags: JSON.stringify(['Company Building', 'Greylock Edge', 'AI Expertise', 'First Check']),
    ethicsTags: JSON.stringify(['Partnership-first', 'AI-focused']),
    personalityType: 'hands-on partner',
    decisionSpeed: '2-4 weeks',
    responsivenessScore: 91,
    applicationUrl: 'https://greylock.com/contact',
  },

  // Tier 1: AI/ML Focus
  {
    email: 'sarah@aiventures.com',
    name: 'Sarah Chen',
    firmName: 'AI Ventures',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkMin: 100,
    checkMax: 500,
    sectors: JSON.stringify(['AI/ML', 'SaaS', 'Developer Tools']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$50M Fund II',
    fundType: 'micro-VC',
    thesis: 'We back technical founders building AI-first products with defensible data moats. Looking for proprietary datasets, novel model architectures, or unique domain applications of LLMs.',
    proofPoints: JSON.stringify({
      'AI/ML': ['Model benchmarks vs baselines', 'Inference cost optimization', 'Proprietary training data', 'Evaluation metrics'],
      'SaaS': ['Product-led growth', 'Time to value <24hrs', 'API-first architecture']
    }),
    portfolio: JSON.stringify([
      { name: 'DataMind', sector: 'AI/ML', stage: 'Seed', outcome: 'Active, growing 200% YoY' },
      { name: 'VectorDB Co', sector: 'Developer Tools', stage: 'Series A', outcome: 'Raised $15M Series A' }
    ]),
    ownershipTarget: '15-20% at Seed',
    valueAddTags: JSON.stringify(['Technical Mentorship', 'Product Feedback', 'Hiring Support']),
    ethicsTags: JSON.stringify(['Responsible AI', 'Diversity']),
    personalityType: 'hands-on mentor',
    decisionSpeed: '2-3 weeks typical',
    responsivenessScore: 95,
    applicationUrl: 'https://aiventures.com/apply',
  },
  {
    email: 'mike@neuralcap.vc',
    name: 'Mike Rodriguez',
    firmName: 'Neural Capital',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A']),
    checkMin: 250,
    checkMax: 2000,
    sectors: JSON.stringify(['AI/ML', 'DeepTech', 'Enterprise']),
    geoFocus: JSON.stringify(['US', 'Global']),
    leadFollow: 'either',
    fundSize: '$200M Fund I',
    valueAddTags: JSON.stringify(['Industry Connections', 'Follow-on Funding', 'Board Experience']),
    ethicsTags: JSON.stringify(['Open Source', 'Research-backed']),
    personalityType: 'strategic advisor',
    decisionSpeed: '3-4 weeks',
    responsivenessScore: 88,
    applicationUrl: 'https://neuralcap.vc/founders',
  },
  {
    email: 'alex@mlseed.fund',
    name: 'Alex Kim',
    firmName: 'ML Seed Fund',
    verified: true,
    stages: JSON.stringify(['Pre-Seed']),
    checkMin: 50,
    checkMax: 250,
    sectors: JSON.stringify(['AI/ML', 'Developer Tools']),
    geoFocus: JSON.stringify(['San Francisco', 'US']),
    leadFollow: 'follow',
    fundSize: '$10M Micro Fund',
    valueAddTags: JSON.stringify(['Technical Mentorship', 'Product Feedback']),
    ethicsTags: JSON.stringify(['Developer-first']),
    personalityType: 'hands-on technical',
    decisionSpeed: '1-2 weeks',
    responsivenessScore: 92,
    applicationUrl: 'https://mlseed.fund/apply',
  },

  // Tier 2: Fintech Focus
  {
    email: 'jessica@fintechfirst.com',
    name: 'Jessica Martinez',
    firmName: 'Fintech First',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A']),
    checkMin: 500,
    checkMax: 3000,
    sectors: JSON.stringify(['Fintech', 'SaaS', 'Enterprise']),
    geoFocus: JSON.stringify(['US', 'Global']),
    leadFollow: 'lead',
    fundSize: '$150M Fund II',
    valueAddTags: JSON.stringify(['Banking Partnerships', 'Regulatory Guidance', 'Customer Intros']),
    ethicsTags: JSON.stringify(['Financial Inclusion']),
    personalityType: 'strategic',
    decisionSpeed: '3-5 weeks',
    responsivenessScore: 85,
    applicationUrl: 'https://fintechfirst.com/founders',
  },
  {
    email: 'david@banktech.vc',
    name: 'David Lee',
    firmName: 'BankTech Ventures',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkMin: 100,
    checkMax: 750,
    sectors: JSON.stringify(['Fintech', 'Crypto/Web3', 'Infrastructure']),
    geoFocus: JSON.stringify(['New York', 'San Francisco']),
    leadFollow: 'either',
    fundSize: '$75M Fund I',
    valueAddTags: JSON.stringify(['Regulatory Guidance', 'Industry Connections', 'Technical Mentorship']),
    ethicsTags: JSON.stringify(['Compliance-first', 'Security']),
    personalityType: 'detail-oriented',
    decisionSpeed: '2-4 weeks',
    responsivenessScore: 90,
    applicationUrl: 'https://banktech.vc/apply',
  },

  // Tier 3: Consumer/Marketplace
  {
    email: 'lisa@consumerlab.fund',
    name: 'Lisa Patel',
    firmName: 'Consumer Lab',
    verified: true,
    stages: JSON.stringify(['Seed']),
    checkMin: 300,
    checkMax: 1000,
    sectors: JSON.stringify(['Consumer', 'Marketplace', 'SaaS']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$100M Fund I',
    valueAddTags: JSON.stringify(['Go-to-Market Strategy', 'PR/Marketing', 'Customer Intros']),
    ethicsTags: JSON.stringify(['Sustainability', 'Direct-to-Consumer']),
    personalityType: 'brand-focused',
    decisionSpeed: '2-3 weeks',
    responsivenessScore: 87,
    applicationUrl: 'https://consumerlab.fund/apply',
  },
  {
    email: 'tom@marketseed.io',
    name: 'Tom Johnson',
    firmName: 'Market Seed',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkMin: 150,
    checkMax: 500,
    sectors: JSON.stringify(['Marketplace', 'Consumer', 'SaaS']),
    geoFocus: JSON.stringify(['US']),
    leadFollow: 'either',
    fundSize: '$30M Fund',
    valueAddTags: JSON.stringify(['Go-to-Market Strategy', 'Growth Hacking', 'Sales Intros']),
    ethicsTags: JSON.stringify(['Community-first']),
    personalityType: 'growth-focused',
    decisionSpeed: '2 weeks typical',
    responsivenessScore: 91,
    applicationUrl: 'https://marketseed.io/founders',
  },

  // Tier 4: Healthcare/Biotech
  {
    email: 'rachel@healthtech.vc',
    name: 'Rachel Wong',
    firmName: 'HealthTech Ventures',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A']),
    checkMin: 500,
    checkMax: 5000,
    sectors: JSON.stringify(['Healthcare', 'Biotech', 'SaaS']),
    geoFocus: JSON.stringify(['US', 'Global']),
    leadFollow: 'lead',
    fundSize: '$250M Fund III',
    valueAddTags: JSON.stringify(['Clinical Trial Guidance', 'Regulatory Support', 'Healthcare Network']),
    ethicsTags: JSON.stringify(['Patient-first', 'Data Privacy']),
    personalityType: 'methodical',
    decisionSpeed: '4-6 weeks',
    responsivenessScore: 82,
    applicationUrl: 'https://healthtech.vc/apply',
  },
  {
    email: 'james@bioseed.fund',
    name: 'James Thompson',
    firmName: 'Bio Seed Fund',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkMin: 200,
    checkMax: 1000,
    sectors: JSON.stringify(['Biotech', 'Healthcare', 'DeepTech']),
    geoFocus: JSON.stringify(['Boston', 'San Francisco']),
    leadFollow: 'either',
    fundSize: '$50M Fund I',
    valueAddTags: JSON.stringify(['Scientific Advisory', 'Lab Partnerships', 'Grant Support']),
    ethicsTags: JSON.stringify(['Research-based', 'Impact']),
    personalityType: 'scientific',
    decisionSpeed: '5-8 weeks',
    responsivenessScore: 78,
    applicationUrl: 'https://bioseed.fund/apply',
  },

  // Tier 5: Climate Tech
  {
    email: 'maya@climatevc.fund',
    name: 'Maya Green',
    firmName: 'Climate VC',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A']),
    checkMin: 500,
    checkMax: 3000,
    sectors: JSON.stringify(['Climate Tech', 'Hardware', 'Energy']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$200M Fund I',
    valueAddTags: JSON.stringify(['Sustainability Network', 'Grant Support', 'Corporate Partnerships']),
    ethicsTags: JSON.stringify(['Climate Impact', 'ESG']),
    personalityType: 'mission-driven',
    decisionSpeed: '3-4 weeks',
    responsivenessScore: 89,
    applicationUrl: 'https://climatevc.fund/founders',
  },
  {
    email: 'carlos@greenseed.io',
    name: 'Carlos Rivera',
    firmName: 'Green Seed',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkMin: 100,
    checkMax: 500,
    sectors: JSON.stringify(['Climate Tech', 'SaaS', 'Agriculture']),
    geoFocus: JSON.stringify(['US', 'Global']),
    leadFollow: 'either',
    fundSize: '$40M Fund',
    valueAddTags: JSON.stringify(['Industry Connections', 'Technical Mentorship', 'Customer Intros']),
    ethicsTags: JSON.stringify(['Sustainability', 'Carbon Neutral']),
    personalityType: 'hands-on',
    decisionSpeed: '2-3 weeks',
    responsivenessScore: 93,
    applicationUrl: 'https://greenseed.io/apply',
  },

  // Tier 6: Enterprise SaaS
  {
    email: 'steve@enterprisefirst.vc',
    name: 'Steve Anderson',
    firmName: 'Enterprise First',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Series B']),
    checkMin: 1000,
    checkMax: 10000,
    sectors: JSON.stringify(['Enterprise', 'SaaS', 'Infrastructure']),
    geoFocus: JSON.stringify(['US']),
    leadFollow: 'lead',
    fundSize: '$500M Fund IV',
    valueAddTags: JSON.stringify(['Enterprise Sales', 'Customer Intros', 'Board Experience']),
    ethicsTags: JSON.stringify(['Business-first']),
    personalityType: 'strategic',
    decisionSpeed: '4-6 weeks',
    responsivenessScore: 84,
    applicationUrl: 'https://enterprisefirst.vc/apply',
  },
  {
    email: 'nina@b2bseed.com',
    name: 'Nina Patel',
    firmName: 'B2B Seed Partners',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkMin: 200,
    checkMax: 1000,
    sectors: JSON.stringify(['Enterprise', 'SaaS', 'Security']),
    geoFocus: JSON.stringify(['San Francisco', 'US']),
    leadFollow: 'either',
    fundSize: '$60M Fund II',
    valueAddTags: JSON.stringify(['Sales Strategy', 'Customer Intros', 'Product Feedback']),
    ethicsTags: JSON.stringify(['Product-led growth']),
    personalityType: 'product-focused',
    decisionSpeed: '2-3 weeks',
    responsivenessScore: 90,
    applicationUrl: 'https://b2bseed.com/founders',
  },

  // Continue with more diverse investors...
  // Crypto/Web3
  {
    email: 'alex@cryptofund.io',
    name: 'Alex Nakamoto',
    firmName: 'Crypto Fund',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed', 'Series A']),
    checkMin: 250,
    checkMax: 5000,
    sectors: JSON.stringify(['Crypto/Web3', 'Infrastructure', 'Fintech']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'either',
    fundSize: '$150M Fund I',
    valueAddTags: JSON.stringify(['Token Economics', 'Community Building', 'Exchange Listings']),
    ethicsTags: JSON.stringify(['Decentralization', 'Open Source']),
    personalityType: 'crypto-native',
    decisionSpeed: '1-2 weeks',
    responsivenessScore: 86,
    applicationUrl: 'https://cryptofund.io/apply',
  },

  // EdTech
  {
    email: 'emily@learnvc.com',
    name: 'Emily Zhang',
    firmName: 'Learn Ventures',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A']),
    checkMin: 300,
    checkMax: 2000,
    sectors: JSON.stringify(['EdTech', 'SaaS', 'Consumer']),
    geoFocus: JSON.stringify(['US', 'Global']),
    leadFollow: 'lead',
    fundSize: '$100M Fund II',
    valueAddTags: JSON.stringify(['Education Partnerships', 'Go-to-Market Strategy', 'Customer Intros']),
    ethicsTags: JSON.stringify(['Education Access', 'Impact']),
    personalityType: 'mission-driven',
    decisionSpeed: '3-4 weeks',
    responsivenessScore: 88,
    applicationUrl: 'https://learnvc.com/apply',
  },

  // Developer Tools
  {
    email: 'sam@devtools.vc',
    name: 'Sam Wilson',
    firmName: 'DevTools Ventures',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkMin: 150,
    checkMax: 750,
    sectors: JSON.stringify(['Developer Tools', 'SaaS', 'Infrastructure']),
    geoFocus: JSON.stringify(['San Francisco', 'Global']),
    leadFollow: 'either',
    fundSize: '$40M Fund I',
    valueAddTags: JSON.stringify(['Technical Mentorship', 'Open Source Strategy', 'Developer Community']),
    ethicsTags: JSON.stringify(['Developer-first', 'Open Source']),
    personalityType: 'technical',
    decisionSpeed: '1-2 weeks',
    responsivenessScore: 94,
    applicationUrl: 'https://devtools.vc/founders',
  },

  // Security/Cybersecurity
  {
    email: 'marcus@securityseed.io',
    name: 'Marcus Brown',
    firmName: 'Security Seed',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A']),
    checkMin: 500,
    checkMax: 3000,
    sectors: JSON.stringify(['Security', 'Enterprise', 'Infrastructure']),
    geoFocus: JSON.stringify(['US']),
    leadFollow: 'lead',
    fundSize: '$120M Fund I',
    valueAddTags: JSON.stringify(['Enterprise Sales', 'CISO Network', 'Compliance Guidance']),
    ethicsTags: JSON.stringify(['Privacy-first', 'Zero Trust']),
    personalityType: 'security-minded',
    decisionSpeed: '3-5 weeks',
    responsivenessScore: 83,
    applicationUrl: 'https://securityseed.io/apply',
  },

  // Hardware/Deep Tech
  {
    email: 'olivia@hardwarevc.fund',
    name: 'Olivia Chen',
    firmName: 'Hardware Ventures',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A']),
    checkMin: 1000,
    checkMax: 5000,
    sectors: JSON.stringify(['Hardware', 'DeepTech', 'Robotics']),
    geoFocus: JSON.stringify(['San Francisco', 'Boston']),
    leadFollow: 'lead',
    fundSize: '$200M Fund II',
    valueAddTags: JSON.stringify(['Manufacturing Support', 'Supply Chain', 'Hardware Expertise']),
    ethicsTags: JSON.stringify(['Innovation', 'R&D-focused']),
    personalityType: 'patient capital',
    decisionSpeed: '6-8 weeks',
    responsivenessScore: 80,
    applicationUrl: 'https://hardwarevc.fund/apply',
  },

  // More diverse angels and micro funds
  {
    email: 'maria@angelnetwork.com',
    name: 'Maria Lopez',
    firmName: 'Bay Area Angels',
    verified: true,
    stages: JSON.stringify(['Pre-Seed']),
    checkMin: 25,
    checkMax: 100,
    sectors: JSON.stringify(['SaaS', 'Consumer', 'Marketplace']),
    geoFocus: JSON.stringify(['San Francisco', 'US']),
    leadFollow: 'follow',
    fundSize: 'Angel Network',
    valueAddTags: JSON.stringify(['Mentorship', 'Network Access']),
    ethicsTags: JSON.stringify(['Diversity', 'Women-led']),
    personalityType: 'supportive',
    decisionSpeed: '1 week',
    responsivenessScore: 95,
    applicationUrl: 'https://angelnetwork.com/apply',
  },
  {
    email: 'kevin@techstars.alumni',
    name: 'Kevin Sharma',
    firmName: 'Techstars Alumni Fund',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkMin: 50,
    checkMax: 250,
    sectors: JSON.stringify(['SaaS', 'AI/ML', 'Enterprise']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'follow',
    fundSize: '$20M Fund',
    valueAddTags: JSON.stringify(['Accelerator Network', 'Mentorship', 'Follow-on Funding']),
    ethicsTags: JSON.stringify(['Founder-friendly']),
    personalityType: 'collaborative',
    decisionSpeed: '2 weeks',
    responsivenessScore: 91,
    applicationUrl: 'https://techstars.com/apply',
  },

  // Student/Young Founder Focused
  {
    email: 'lucy@dromroomfund.com',
    name: 'Lucy Chang',
    firmName: 'Dorm Room Fund',
    verified: true,
    stages: JSON.stringify(['Pre-Seed']),
    checkMin: 20,
    checkMax: 50,
    sectors: JSON.stringify(['SaaS', 'Consumer', 'AI/ML', 'Marketplace']),
    geoFocus: JSON.stringify(['US']),
    leadFollow: 'follow',
    fundSize: '$5M Fund',
    valueAddTags: JSON.stringify(['Student Network', 'Mentorship', 'Campus Resources']),
    ethicsTags: JSON.stringify(['Student founders', 'First-time founders']),
    personalityType: 'supportive',
    decisionSpeed: '1-2 weeks',
    responsivenessScore: 96,
    applicationUrl: 'https://dormroomfund.com/apply',
  },
  {
    email: 'jason@1517fund.com',
    name: 'Jason Palmer',
    firmName: '1517 Fund',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkMin: 100,
    checkMax: 500,
    sectors: JSON.stringify(['DeepTech', 'AI/ML', 'Biotech', 'SaaS']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'either',
    fundSize: '$30M Fund',
    valueAddTags: JSON.stringify(['Dropout Support', 'Long-term Vision', 'Network Access']),
    ethicsTags: JSON.stringify(['Alternative education', 'Young founders']),
    personalityType: 'visionary',
    decisionSpeed: '2-3 weeks',
    responsivenessScore: 90,
    applicationUrl: 'https://1517fund.com/apply',
  },

  // More specialized funds
  {
    email: 'priya@diversityvc.fund',
    name: 'Priya Desai',
    firmName: 'Diversity Ventures',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkMin: 100,
    checkMax: 500,
    sectors: JSON.stringify(['SaaS', 'Consumer', 'Healthcare', 'Fintech']),
    geoFocus: JSON.stringify(['US', 'Global']),
    leadFollow: 'either',
    fundSize: '$50M Fund I',
    valueAddTags: JSON.stringify(['Mentorship', 'Network Access', 'Go-to-Market Strategy']),
    ethicsTags: JSON.stringify(['Diversity', 'Inclusion', 'Underrepresented founders']),
    personalityType: 'mission-driven',
    decisionSpeed: '2-3 weeks',
    responsivenessScore: 92,
    applicationUrl: 'https://diversityvc.fund/apply',
  },

  // Add 35 more diverse investors...
  // I'll create a variety across different sectors, stages, and check sizes
]

// Function to generate more investors programmatically
function generateMoreInvestors(startIndex: number, count: number) {
  const generated = []
  const firms = [
    'Seed Capital', 'Early Ventures', 'Growth Partners', 'Venture Labs',
    'Innovation Fund', 'Tech Seed', 'Future Capital', 'Vision Ventures',
    'Impact Investors', 'Alpha Fund', 'Beta Ventures', 'Gamma Capital',
    'Delta Partners', 'Epsilon Seed', 'Zeta Ventures', 'Theta Capital',
    'Lambda Fund', 'Sigma Ventures', 'Omega Partners', 'Prime Capital'
  ]
  
  // Real application URLs for well-known VCs
  const realVCUrls: Record<string, string> = {
    'Y Combinator': 'https://www.ycombinator.com/apply',
    'Techstars': 'https://www.techstars.com/apply',
    'Sequoia': 'https://www.sequoiacap.com/companies',
    'a16z': 'https://a16z.com/about/submit-pitch',
    '500 Startups': 'https://500.co/apply',
  }
  
  const names = [
    'Jennifer Lee', 'Michael Chen', 'Amanda White', 'Robert Kim',
    'Sarah Johnson', 'David Martinez', 'Laura Garcia', 'Chris Taylor',
    'Michelle Brown', 'Brian Wilson', 'Nicole Anderson', 'Ryan Thomas',
    'Jessica Moore', 'Daniel Jackson', 'Ashley Martin', 'Matthew Lee',
    'Emma Davis', 'Andrew Miller', 'Sophia Rodriguez', 'Joshua Martinez'
  ]

  for (let i = 0; i < count; i++) {
    const firmName = firms[i % firms.length] + ` ${Math.floor(i / firms.length) + 1}`
    const name = names[i % names.length]
    const sectorCount = 1 + Math.floor(Math.random() * 3)
    const selectedSectors = SECTORS.sort(() => 0.5 - Math.random()).slice(0, sectorCount)
    const stageCount = 1 + Math.floor(Math.random() * 2)
    const selectedStages = STAGES.slice(0, stageCount)
    const checkMin = [25, 50, 100, 150, 200, 250, 500, 750, 1000][Math.floor(Math.random() * 9)]
    const checkMax = checkMin * (1.5 + Math.random() * 3)
    const valueCount = 2 + Math.floor(Math.random() * 3)
    const selectedValues = VALUE_ADDS.sort(() => 0.5 - Math.random()).slice(0, valueCount)
    const geoCount = 1 + Math.floor(Math.random() * 2)
    const selectedGeo = US_REGIONS.sort(() => 0.5 - Math.random()).slice(0, geoCount)
    
    const urlSlug = firmName.toLowerCase().replace(/\s+/g, '')
    
    generated.push({
      email: `contact${startIndex + i}@${urlSlug}.com`,
      name,
      firmName,
      verified: Math.random() > 0.2,
      stages: JSON.stringify(selectedStages),
      checkMin,
      checkMax: Math.round(checkMax),
      sectors: JSON.stringify(selectedSectors),
      geoFocus: JSON.stringify(selectedGeo),
      leadFollow: ['lead', 'follow', 'either'][Math.floor(Math.random() * 3)],
      fundSize: `$${Math.floor(checkMax * 50)}M Fund`,
      fundType: ['micro-VC', 'institutional', 'CVC', 'accelerator'][Math.floor(Math.random() * 4)],
      valueAddTags: JSON.stringify(selectedValues),
      ethicsTags: JSON.stringify(['Founder-friendly']),
      personalityType: ['hands-on', 'strategic', 'mentor', 'technical'][Math.floor(Math.random() * 4)],
      decisionSpeed: ['1-2 weeks', '2-3 weeks', '3-4 weeks', '4-6 weeks'][Math.floor(Math.random() * 4)],
      responsivenessScore: 75 + Math.floor(Math.random() * 20),
      // Use real working URL structure
      applicationUrl: `https://www.${urlSlug}.vc/apply`,
    })
  }
  
  return generated
}

// Combine comprehensive VCs (includes all VCs, fellowships, grants), elite VCs, handcrafted, and generated investors
// Use comprehensiveVCs as the primary source since it has all the VCs, fellowships, and grants we added
const allInvestors = [...comprehensiveVCs, ...eliteVCs, ...investors, ...generateMoreInvestors(eliteVCs.length + investors.length + comprehensiveVCs.length, 10)]

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data
  console.log('Clearing existing data...')
  await prisma.matchScore.deleteMany()
  await prisma.application.deleteMany()
  await prisma.bookmark.deleteMany()
  await prisma.resumeAnalysis.deleteMany()
  await prisma.mentor.deleteMany()
  await prisma.investor.deleteMany()
  await prisma.founder.deleteMany()

  // Create investors
  console.log(`Creating ${allInvestors.length} investors...`)
  for (const investor of allInvestors) {
    await prisma.investor.create({
      data: investor,
    })
  }

  // Create a sample founder
  console.log('Creating sample founder...')
  await prisma.founder.create({
    data: {
      email: 'demo@founder.com',
      name: 'Demo Founder',
      age: 24,
      education: 'Stanford University (Dropped out)',
      willingToDropOut: true,
      startupName: 'AI Startup Co',
      stage: 'seed',
      sectors: JSON.stringify(['AI/ML', 'SaaS']),
      businessModel: 'B2B SaaS',
      location: 'San Francisco',
      fundingNeed: 500,
      ethicsTags: JSON.stringify(['Responsible AI', 'Open Source']),
      personalityTags: JSON.stringify(['hands-on', 'technical']),
      valueAddNeeds: JSON.stringify(['Technical Mentorship', 'Customer Intros']),
    },
  })

  // Create some mentors
  console.log('Creating mentors...')
  await prisma.mentor.createMany({
    data: [
      {
        email: 'mentor1@example.com',
        name: 'Sarah Expert',
        expertiseTags: JSON.stringify(['Product Management', 'Go-to-Market', 'Fundraising']),
        sectors: JSON.stringify(['SaaS', 'Enterprise']),
        location: 'San Francisco',
        timePerMonth: '2-4 hours',
        bio: 'Former VP Product at Series C startup. Raised $50M+. Love helping first-time founders.',
        verified: true,
      },
      {
        email: 'mentor2@example.com',
        name: 'Mike Engineer',
        expertiseTags: JSON.stringify(['Engineering', 'AI/ML', 'Scaling']),
        sectors: JSON.stringify(['AI/ML', 'Developer Tools']),
        location: 'New York',
        timePerMonth: '1-2 hours',
        bio: 'Ex-Google ML Engineer. Built teams of 50+. Can help with technical architecture.',
        verified: true,
      },
    ],
  })

  console.log('✅ Seeding complete!')
  console.log(`Created ${allInvestors.length} investors`)
  console.log('Created 1 sample founder')
  console.log('Created 2 mentors')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

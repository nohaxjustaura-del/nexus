/**
 * Elite & Top-Tier VC Seed Data
 * Based on comprehensive VC research
 */

export const eliteVCs = [
  // Sequoia Capital
  {
    email: 'arc@sequoiacap.com',
    name: 'Sequoia Arc Team',
    firmName: 'Sequoia Capital',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Series B', 'Growth']),
    checkMin: 500,
    checkMax: 50000,
    sectors: JSON.stringify(['AI/ML', 'SaaS', 'Enterprise', 'Consumer', 'Fintech', 'Biotech']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$9B+ Multi-stage',
    fundType: 'institutional',
    thesis: 'PMF-oriented partnering (Arc/seed). Probe for PMF type (pull vs push vs network). Crisp insight, wedge, milestones. Founder quality + contrarian insight first; metrics as learning engine toward PMF.',
    proofPoints: JSON.stringify({
      'All': ['PMF signals (retention, organic, network effects)', 'Contrarian but validated insight', 'Clear wedge strategy', 'Learning velocity', 'Technical co-founder strength']
    }),
    portfolio: JSON.stringify([
      { name: 'Apple', sector: 'Consumer', stage: 'Early', outcome: '$3T+ valuation' },
      { name: 'Google', sector: 'Enterprise', stage: 'Series A', outcome: '$1.7T valuation' },
      { name: 'Stripe', sector: 'Fintech', stage: 'Series A', outcome: '$95B valuation' },
      { name: 'Airbnb', sector: 'Consumer', stage: 'Series A', outcome: 'Public' }
    ]),
    ownershipTarget: '15-20%',
    valueAddTags: JSON.stringify(['CEO Forums', 'Talent/Recruiting', 'Network', 'Arc Program']),
    ethicsTags: JSON.stringify(['Founder-first', 'Long-term']),
    personalityType: 'PMF-obsessed',
    decisionSpeed: '2-4 weeks (fast, confident)',
    responsivenessScore: 95,
    applicationUrl: 'https://www.sequoiacap.com/apply',
  },

  // Andreessen Horowitz (a16z)
  {
    email: 'pitch@a16z.com',
    name: 'a16z General Partner',
    firmName: 'Andreessen Horowitz',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Series B', 'Growth']),
    checkMin: 500,
    checkMax: 50000,
    sectors: JSON.stringify(['AI/ML', 'Crypto/Web3', 'SaaS', 'Fintech', 'Biotech', 'Enterprise']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$35B+ Multi-stage (AI, Bio, Crypto funds)',
    fundType: 'institutional',
    thesis: 'Software eating the world. Strong AI-first emphasis. Deep category theses (marketplaces, applied AI, crypto). Process-savvy fundraising preferred. Fine with very early if thesis is strong. Bold technologists (first-time or repeat).',
    proofPoints: JSON.stringify({
      'AI/ML': ['AI-first approach', 'Applied AI differentiation', 'Not just API wrapper', 'Category-specific use case'],
      'Crypto/Web3': ['On-chain traction', 'Token economics', 'Regulatory clarity', 'Community'],
      'SaaS': ['Product-market fit', 'Efficient growth', 'Category leadership']
    }),
    portfolio: JSON.stringify([
      { name: 'Facebook', sector: 'Consumer', stage: 'Series A', outcome: '$1.2T+ valuation' },
      { name: 'Coinbase', sector: 'Crypto', stage: 'Series A', outcome: 'Public $40B+' },
      { name: 'GitHub', sector: 'Developer Tools', stage: 'Series A', outcome: 'Acquired $7.5B' },
      { name: 'Slack', sector: 'Enterprise', stage: 'Series A', outcome: 'Acquired $27B' }
    ]),
    ownershipTarget: '15-20%',
    valueAddTags: JSON.stringify(['Platform Support', 'Hiring/Marketing', 'M&A Intros', 'Talent Network', 'Content/Engineering']),
    ethicsTags: JSON.stringify(['Bold vision', 'Thesis-driven']),
    personalityType: 'process-oriented platform',
    decisionSpeed: '4-6 weeks',
    responsivenessScore: 92,
    applicationUrl: 'https://a16z.com/about/submit-pitch',
  },

  // Accel
  {
    email: 'team@accel.com',
    name: 'Accel Partner',
    firmName: 'Accel',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Series B', 'Growth']),
    checkMin: 500,
    checkMax: 50000,
    sectors: JSON.stringify(['AI/ML', 'Enterprise', 'SaaS', 'Consumer', 'Fintech']),
    geoFocus: JSON.stringify(['Global', 'US', 'London']),
    leadFollow: 'lead',
    fundSize: '$3B+ Global',
    fundType: 'institutional',
    thesis: 'Sector-agnostic tech across enterprise software, consumer internet, fintech, AI/data. Ambitious product-driven founders. Active across AI, longevity, govtech. Crisp wedge + category standard potential.',
    proofPoints: JSON.stringify({
      'All': ['Clear market wedge', 'Category-defining potential', 'Product-driven', 'Ambition']
    }),
    portfolio: JSON.stringify([
      { name: 'Facebook', sector: 'Consumer', stage: 'Series A', outcome: '$1.2T+' },
      { name: 'Slack', sector: 'Enterprise', stage: 'Series A', outcome: 'Acquired $27B' },
      { name: 'Spotify', sector: 'Consumer', stage: 'Growth', outcome: 'Public $30B+' },
      { name: 'CrowdStrike', sector: 'Security', stage: 'Series A', outcome: 'Public $70B+' }
    ]),
    ownershipTarget: '15-20%',
    valueAddTags: JSON.stringify(['Product Help', 'Hiring', 'Founder Community', 'Network']),
    ethicsTags: JSON.stringify(['Product-first', 'Global']),
    personalityType: 'product-driven',
    decisionSpeed: '3-5 weeks',
    responsivenessScore: 91,
    applicationUrl: 'https://www.accel.com/companies',
  },

  // Benchmark
  {
    email: 'team@benchmark.com',
    name: 'Benchmark Partner',
    firmName: 'Benchmark',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A']),
    checkMin: 500,
    checkMax: 50000,
    sectors: JSON.stringify(['Consumer', 'Enterprise', 'SaaS', 'AI/ML', 'Marketplace']),
    geoFocus: JSON.stringify(['US', 'Global']),
    leadFollow: 'lead',
    fundSize: '$2.8B Fund',
    fundType: 'institutional',
    thesis: 'Early-stage specialist. Partner-led, small team with high founder involvement. Known for speed and founder-friendliness (flat structure). Mobile/social/consumer internet and enterprise SaaS/AI. Visionary founders (often first-time).',
    proofPoints: JSON.stringify({
      'All': ['Visionary insight', 'Speed to market', 'Founder-market fit']
    }),
    portfolio: JSON.stringify([
      { name: 'Uber', sector: 'Consumer', stage: 'Series A', outcome: 'Public $80B+' },
      { name: 'Twitter', sector: 'Consumer', stage: 'Series A', outcome: 'Acquired $44B' },
      { name: 'Snapchat', sector: 'Consumer', stage: 'Series A', outcome: 'Public $25B+' },
      { name: 'Discord', sector: 'Consumer', stage: 'Series A', outcome: '$15B+ valuation' }
    ]),
    ownershipTarget: '15-20%',
    valueAddTags: JSON.stringify(['Partner-led Support', 'Speed', 'Flat Structure', 'Founder-friendly']),
    ethicsTags: JSON.stringify(['Founder-centric', 'Fast decisions']),
    personalityType: 'partner-driven',
    decisionSpeed: '1-3 weeks (rapid)',
    responsivenessScore: 94,
    applicationUrl: 'https://www.benchmark.com',
  },

  // Greylock Partners
  {
    email: 'contact@greylock.com',
    name: 'Greylock Partner',
    firmName: 'Greylock',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed', 'Series A']),
    checkMin: 500,
    checkMax: 50000,
    sectors: JSON.stringify(['AI/ML', 'Enterprise', 'Consumer', 'SaaS']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$2B+ Fund',
    fundType: 'institutional',
    thesis: 'Very early (often first check) with strong AI-first bias. Leads ~80% seed/A deals. Technical teams with vision for big networks. Hands-on company-building via Greylock Edge. "Partner from day one."',
    proofPoints: JSON.stringify({
      'AI/ML': ['AI-native vision', 'Network/platform potential', 'Technical founding team', 'Edge program fit'],
      'All': ['Big network vision', 'Technical depth', 'Partnership mindset']
    }),
    portfolio: JSON.stringify([
      { name: 'LinkedIn', sector: 'Consumer', stage: 'Seed', outcome: 'Acquired $26B' },
      { name: 'Airbnb', sector: 'Consumer', stage: 'Series A', outcome: 'Public $90B+' },
      { name: 'Discord', sector: 'Consumer', stage: 'Series A', outcome: '$15B+ valuation' },
      { name: 'Figma', sector: 'Developer Tools', stage: 'Series A', outcome: 'Acquired $20B' }
    ]),
    ownershipTarget: '15-20%',
    valueAddTags: JSON.stringify(['Greylock Edge', 'Company Building', 'AI Expertise', 'Network CEOs']),
    ethicsTags: JSON.stringify(['Partnership-first', 'AI-focused', 'Hands-on']),
    personalityType: 'hands-on partner',
    decisionSpeed: '2-4 weeks',
    responsivenessScore: 93,
    applicationUrl: 'https://greylock.com/contact',
  },

  // First Round Capital
  {
    email: 'team@firstround.com',
    name: 'First Round Partner',
    firmName: 'First Round',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkMin: 500,
    checkMax: 10000,
    sectors: JSON.stringify(['SaaS', 'Consumer', 'Marketplace', 'Fintech', 'AI/ML', 'Developer Tools']),
    geoFocus: JSON.stringify(['US']),
    leadFollow: 'lead',
    fundSize: '$1.5B AUM',
    fundType: 'institutional',
    thesis: 'Seed specialists. Partner-meeting readiness, narrative clarity, "why this team sees something others don\'t." First-time founders with technical backgrounds. Strong platform team with FRCO community.',
    proofPoints: JSON.stringify({
      'All': ['Narrative clarity', 'Team unique advantage', 'Partner-ready materials', 'First product focus']
    }),
    portfolio: JSON.stringify([
      { name: 'Uber', sector: 'Consumer', stage: 'Seed', outcome: 'Public $80B+' },
      { name: 'Square', sector: 'Fintech', stage: 'Seed', outcome: 'Public $40B+' },
      { name: 'Roblox', sector: 'Consumer', stage: 'Seed', outcome: 'Public $30B+' },
      { name: 'Notion', sector: 'SaaS', stage: 'Seed', outcome: '$10B+ valuation' }
    ]),
    ownershipTarget: '10-15%',
    valueAddTags: JSON.stringify(['Platform Team', 'FRCO Community', 'Founder Support', 'Research']),
    ethicsTags: JSON.stringify(['Founder-friendly', 'Seed-focused', 'First-time founders']),
    personalityType: 'narrative-focused',
    decisionSpeed: '2-4 weeks',
    responsivenessScore: 92,
    applicationUrl: 'https://firstround.com/companies/apply',
  },

  // Bessemer Venture Partners
  {
    email: 'team@bvp.com',
    name: 'Bessemer Partner',
    firmName: 'Bessemer',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Series B', 'Growth']),
    checkMin: 500,
    checkMax: 50000,
    sectors: JSON.stringify(['SaaS', 'Enterprise', 'Cloud', 'Consumer', 'Fintech', 'Healthcare', 'AI/ML']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$9B+ Multi-stage',
    fundType: 'institutional',
    thesis: 'Cloud/SaaS benchmarks mindset. Efficient growth and durability. "Centaur" trajectory ($100M ARR). Experienced operators, often repeat founders. Deep operational support via BVP Growth team.',
    proofPoints: JSON.stringify({
      'SaaS': ['Efficient CAC payback (<12mo)', 'Net retention >100%', 'Path to $100M ARR', 'Benchmarked metrics', 'Durability story']
    }),
    portfolio: JSON.stringify([
      { name: 'LinkedIn', sector: 'Consumer', stage: 'Series A', outcome: 'Acquired $26B' },
      { name: 'Shopify', sector: 'SaaS', stage: 'Series A', outcome: 'Public $80B+' },
      { name: 'Twilio', sector: 'Developer Tools', stage: 'Series A', outcome: 'Public $10B+' },
      { name: 'Canva', sector: 'SaaS', stage: 'Growth', outcome: '$40B+ valuation' }
    ]),
    ownershipTarget: '15-20%',
    valueAddTags: JSON.stringify(['BVP Growth Team', 'Cloud Benchmarks', 'Connections', 'Centaur Path']),
    ethicsTags: JSON.stringify(['Efficiency-focused', 'Durability']),
    personalityType: 'metrics-driven',
    decisionSpeed: '3-5 weeks',
    responsivenessScore: 89,
    applicationUrl: 'https://www.bvp.com/atlas',
  },

  // Khosla Ventures
  {
    email: 'submissions@khoslaventures.com',
    name: 'Khosla Partner',
    firmName: 'Khosla Ventures',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Series B', 'Growth']),
    checkMin: 500,
    checkMax: 50000,
    sectors: JSON.stringify(['AI/ML', 'DeepTech', 'Biotech', 'Hardware', 'Climate Tech', 'Crypto/Web3']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$15B+ Frontier Tech',
    fundType: 'institutional',
    thesis: '"People over plans" with direct operating style. Looks for "A" founders who know what they know and don\'t. Domain experience optional if insight is real. High-variance, technical bets. "Black Swan" opportunities.',
    proofPoints: JSON.stringify({
      'All': ['Founder quality (intellect, grit)', 'Real insight', 'Technical depth', 'High-risk/high-reward', 'Frontier technology']
    }),
    portfolio: JSON.stringify([
      { name: 'DoorDash', sector: 'Consumer', stage: 'Series A', outcome: 'Public $50B+' },
      { name: 'Instacart', sector: 'Consumer', stage: 'Series A', outcome: 'Public $10B+' },
      { name: 'Square', sector: 'Fintech', stage: 'Series A', outcome: 'Public $40B+' },
      { name: 'OpenAI', sector: 'AI/ML', stage: 'Early', outcome: '$157B valuation' }
    ]),
    ownershipTarget: '15-25%',
    valueAddTags: JSON.stringify(['Technical Help', 'Direct Feedback', 'Silicon Valley Network', 'Frontier Tech Expertise']),
    ethicsTags: JSON.stringify(['Technical-first', 'High-variance bets']),
    personalityType: 'direct operator',
    decisionSpeed: '2-4 weeks',
    responsivenessScore: 88,
    applicationUrl: 'https://www.khoslaventures.com/contact',
  },

  // Founders Fund
  {
    email: 'team@foundersfund.com',
    name: 'Founders Fund Partner',
    firmName: 'Founders Fund',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Series B', 'Growth']),
    checkMin: 500,
    checkMax: 50000,
    sectors: JSON.stringify(['AI/ML', 'DeepTech', 'Biotech', 'Crypto/Web3', 'Space/Aerospace', 'Fintech']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$12B+ Contrarian Tech',
    fundType: 'institutional',
    thesis: 'Contrarian, ambition-maximizing lens. Responds to hard tech/transformational quests and non-consensus visions. "Back moonshots." Founder-centric with minimum interference. Mission-driven, technical breakthroughs.',
    proofPoints: JSON.stringify({
      'All': ['Contrarian but defensible', 'Transformational potential', 'Technical moat', 'Strong "why now"', 'Big swing ambition']
    }),
    portfolio: JSON.stringify([
      { name: 'SpaceX', sector: 'Aerospace', stage: 'Series A', outcome: '$180B+ valuation' },
      { name: 'Palantir', sector: 'Enterprise', stage: 'Series A', outcome: 'Public $60B+' },
      { name: 'Stripe', sector: 'Fintech', stage: 'Series B', outcome: '$95B valuation' },
      { name: 'Airbnb', sector: 'Consumer', stage: 'Series A', outcome: 'Public $90B+' }
    ]),
    ownershipTarget: '10-20%',
    valueAddTags: JSON.stringify(['Founder-centric', 'Technical Network', 'Minimum Interference', 'Moonshot Support']),
    ethicsTags: JSON.stringify(['Contrarian', 'Ambitious', 'Founder-led']),
    personalityType: 'contrarian visionary',
    decisionSpeed: '3-6 weeks',
    responsivenessScore: 87,
    applicationUrl: 'https://foundersfund.com/companies',
  },

  // General Catalyst
  {
    email: 'team@generalcatalyst.com',
    name: 'General Catalyst Partner',
    firmName: 'General Catalyst',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Series B', 'Growth']),
    checkMin: 500,
    checkMax: 50000,
    sectors: JSON.stringify(['AI/ML', 'Healthcare', 'Enterprise', 'Consumer', 'Fintech', 'Crypto/Web3']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$25B+ Multi-stage',
    fundType: 'institutional',
    thesis: '"Enduring companies" focus. Novel capital solutions. Applied AI/transformation theses especially in health. Resilience and efficient scaling, not just speed. Bold founders tackling huge markets to change status quo.',
    proofPoints: JSON.stringify({
      'All': ['Durability indicators', 'Capital efficiency', 'Long-term moat', 'Transformation potential'],
      'Healthcare': ['Applied AI in health', 'Regulatory pathway', 'Clinical validation']
    }),
    portfolio: JSON.stringify([
      { name: 'Stripe', sector: 'Fintech', stage: 'Series A', outcome: '$95B valuation' },
      { name: 'Snap', sector: 'Consumer', stage: 'Series A', outcome: 'Public $25B+' },
      { name: 'Airbnb', sector: 'Consumer', stage: 'Series A', outcome: 'Public $90B+' },
      { name: 'Anduril', sector: 'DeepTech', stage: 'Series A', outcome: '$14B+ valuation' }
    ]),
    ownershipTarget: '15-20%',
    valueAddTags: JSON.stringify(['Long-term Support', 'Transformation Help', 'Recruiting', 'Marketing']),
    ethicsTags: JSON.stringify(['Enduring focus', 'Patient capital']),
    personalityType: 'transformation-focused',
    decisionSpeed: '4-6 weeks',
    responsivenessScore: 90,
    applicationUrl: 'https://www.generalcatalyst.com/contact',
  },

  // Y Combinator
  {
    email: 'apply@ycombinator.com',
    name: 'YC Partners',
    firmName: 'Y Combinator',
    verified: true,
    stages: JSON.stringify(['Pre-Seed']),
    checkMin: 125,
    checkMax: 500,
    sectors: JSON.stringify(['SaaS', 'AI/ML', 'Fintech', 'Biotech', 'Hardware', 'Consumer', 'Enterprise', 'Marketplace']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'either',
    fundSize: 'Accelerator ($500K for ~7%)',
    fundType: 'accelerator',
    thesis: 'Broad tech focus (500 startups/batch). Intensive 3-month program. Weekly dinners, alumni mentorship, demo day. Very competitive but moves by batch schedule. Predominantly SaaS, fintech, biotech, hardware, AI.',
    proofPoints: JSON.stringify({
      'All': ['MVP or prototype', 'Founding team strength', 'Growth potential', 'Clear problem/solution']
    }),
    portfolio: JSON.stringify([
      { name: 'Airbnb', sector: 'Consumer', stage: 'Pre-seed', outcome: 'Public $90B+' },
      { name: 'Dropbox', sector: 'SaaS', stage: 'Pre-seed', outcome: 'Public $10B+' },
      { name: 'Stripe', sector: 'Fintech', stage: 'Pre-seed', outcome: '$95B valuation' },
      { name: 'DoorDash', sector: 'Consumer', stage: 'Pre-seed', outcome: 'Public $50B+' },
      { name: 'Coinbase', sector: 'Crypto', stage: 'Pre-seed', outcome: 'Public $40B+' }
    ]),
    ownershipTarget: '~7%',
    valueAddTags: JSON.stringify(['3-Month Program', 'Alumni Network', 'Demo Day', 'Weekly Dinners', 'Mentorship']),
    ethicsTags: JSON.stringify(['Founder-focused', 'Community', 'Early-stage']),
    personalityType: 'program-driven',
    decisionSpeed: 'Batch cycle (apply by deadline)',
    responsivenessScore: 94,
    applicationUrl: 'https://www.ycombinator.com/apply',
  },

  // Lightspeed Venture Partners
  {
    email: 'contact@lsvp.com',
    name: 'Lightspeed Partner',
    firmName: 'Lightspeed',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Series B', 'Growth']),
    checkMin: 1000,
    checkMax: 10000,
    sectors: JSON.stringify(['Enterprise', 'Consumer', 'AI/ML', 'Climate Tech', 'SaaS']),
    geoFocus: JSON.stringify(['Global', 'US', 'India', 'China']),
    leadFollow: 'lead',
    fundSize: '$18B+ Global',
    fundType: 'institutional',
    thesis: 'Early and multi-stage with structured company-building (Launch program). Active AI/infra theses. Path acceleration via advisory, workshops, lighthouse resources. Global presence.',
    proofPoints: JSON.stringify({
      'All': ['Scalability potential', 'Multi-stage trajectory', 'Program receptiveness', 'Global ambition']
    }),
    portfolio: JSON.stringify([
      { name: 'Snap', sector: 'Consumer', stage: 'Series A', outcome: 'Public $25B+' },
      { name: 'Affirm', sector: 'Fintech', stage: 'Series A', outcome: 'Public $10B+' },
      { name: 'Grubhub', sector: 'Consumer', stage: 'Series A', outcome: 'Public $7B+' },
      { name: 'Epic Games', sector: 'Consumer', stage: 'Growth', outcome: '$32B valuation' }
    ]),
    ownershipTarget: '15-20%',
    valueAddTags: JSON.stringify(['Launch Program', 'Global Network', 'Advisory', 'Workshops']),
    ethicsTags: JSON.stringify(['Structured support', 'Global']),
    personalityType: 'program-oriented',
    decisionSpeed: '4-6 weeks',
    responsivenessScore: 89,
    applicationUrl: 'https://lsvp.com/contact',
  },

  // Kleiner Perkins
  {
    email: 'team@kleinerperkins.com',
    name: 'Kleiner Perkins Partner',
    firmName: 'Kleiner Perkins',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Series B']),
    checkMin: 500,
    checkMax: 50000,
    sectors: JSON.stringify(['AI/ML', 'Consumer', 'Enterprise', 'Climate Tech', 'Biotech', 'SaaS']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$6B+ Multi-stage',
    fundType: 'institutional',
    thesis: 'Software/consumer internet including AI, green tech, biotech. Breakthrough innovators tackling big problems. "Green Growth" for climate. Mentor network, talent bench.',
    proofPoints: JSON.stringify({
      'Climate Tech': ['Green Growth program fit', 'Climate impact', 'Technology breakthrough'],
      'All': ['Big problem solving', 'Innovation', 'Breakthrough technology']
    }),
    portfolio: JSON.stringify([
      { name: 'Amazon (AWS)', sector: 'Enterprise', stage: 'Early', outcome: '$1.5T+ valuation' },
      { name: 'Uber', sector: 'Consumer', stage: 'Series A', outcome: 'Public $80B+' },
      { name: 'Slack', sector: 'Enterprise', stage: 'Series A', outcome: 'Acquired $27B' },
      { name: 'Snap', sector: 'Consumer', stage: 'Series A', outcome: 'Public $25B+' }
    ]),
    ownershipTarget: '15-20%',
    valueAddTags: JSON.stringify(['Green Growth', 'Mentor Network', 'Talent Bench', 'Big Problems']),
    ethicsTags: JSON.stringify(['Innovation-first', 'Climate-friendly']),
    personalityType: 'innovation-focused',
    decisionSpeed: '3-5 weeks',
    responsivenessScore: 88,
    applicationUrl: 'https://www.kleinerperkins.com/companies',
  },

  // NEA (New Enterprise Associates)
  {
    email: 'info@nea.com',
    name: 'NEA Partner',
    firmName: 'NEA',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Series B', 'Growth']),
    checkMin: 500,
    checkMax: 50000,
    sectors: JSON.stringify(['SaaS', 'AI/ML', 'Consumer', 'Fintech', 'Biotech', 'Healthcare', 'Enterprise']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$25B+ Multi-stage',
    fundType: 'institutional',
    thesis: 'Sector-agnostic with global reach. Large market bets. Extensive platform (NEA Summit, talent, growth advisors). Multi-stage commitment.',
    proofPoints: JSON.stringify({
      'All': ['Large market opportunity', 'Global scalability', 'Strong team', 'Platform receptiveness']
    }),
    portfolio: JSON.stringify([
      { name: 'MongoDB', sector: 'Enterprise', stage: 'Series A', outcome: 'Public $10B+' },
      { name: 'Databricks', sector: 'AI/ML', stage: 'Growth', outcome: '$43B valuation' },
      { name: 'Robinhood', sector: 'Fintech', stage: 'Series A', outcome: 'Public $10B+' },
      { name: 'Duolingo', sector: 'Consumer', stage: 'Series A', outcome: 'Public $7B+' }
    ]),
    ownershipTarget: '15-20%',
    valueAddTags: JSON.stringify(['NEA Summit', 'Talent Network', 'Growth Advisors', 'Global Reach']),
    ethicsTags: JSON.stringify(['Large markets', 'Global']),
    personalityType: 'platform-driven',
    decisionSpeed: '4-6 weeks',
    responsivenessScore: 87,
    applicationUrl: 'https://www.nea.com/contact',
  },

  // Union Square Ventures
  {
    email: 'hello@usv.com',
    name: 'USV Partner',
    firmName: 'Union Square Ventures',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Series B']),
    checkMin: 1000,
    checkMax: 10000,
    sectors: JSON.stringify(['Marketplace', 'Consumer', 'Crypto/Web3', 'Enterprise', 'SaaS']),
    geoFocus: JSON.stringify(['US', 'NYC', 'Global']),
    leadFollow: 'lead',
    fundSize: '$1B+ Early-Growth',
    fundType: 'institutional',
    thesis: 'Network effect businesses and platforms. Original web to crypto/Web3. Founder-led with strong community focus and open-source emphasis.',
    proofPoints: JSON.stringify({
      'All': ['Network effects', 'Community-driven', 'Open-source friendly', 'Platform potential']
    }),
    portfolio: JSON.stringify([
      { name: 'Twitter', sector: 'Consumer', stage: 'Series A', outcome: 'Acquired $44B' },
      { name: 'Coinbase', sector: 'Crypto', stage: 'Series A', outcome: 'Public $40B+' },
      { name: 'Etsy', sector: 'Marketplace', stage: 'Series A', outcome: 'Public $10B+' },
      { name: 'Twilio', sector: 'Developer Tools', stage: 'Series A', outcome: 'Public $10B+' }
    ]),
    ownershipTarget: '15-20%',
    valueAddTags: JSON.stringify(['NYC Network', 'Community Focus', 'Open-Source Support', 'Web3 Expertise']),
    ethicsTags: JSON.stringify(['Community-first', 'Open-source']),
    personalityType: 'network-focused',
    decisionSpeed: '3-5 weeks',
    responsivenessScore: 89,
    applicationUrl: 'https://www.usv.com/writing',
  },

  // Insight Partners
  {
    email: 'info@insightpartners.com',
    name: 'Insight Partner',
    firmName: 'Insight Partners',
    verified: true,
    stages: JSON.stringify(['Series A', 'Series B', 'Growth']),
    checkMin: 3000,
    checkMax: 50000,
    sectors: JSON.stringify(['SaaS', 'AI/ML', 'Fintech', 'Security', 'Enterprise', 'Healthcare']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$90B+ Growth',
    fundType: 'institutional',
    thesis: 'Post-PMF scale-ups. "Insight Onsite" growth team provides sales, recruiting, analytics support. Massive network for high-growth software.',
    proofPoints: JSON.stringify({
      'SaaS': ['ARR >$1M', 'Strong unit economics', 'Scalability proven', 'Growth trajectory'],
      'All': ['Post-PMF traction', 'Growth mindset', 'Platform receptiveness']
    }),
    portfolio: JSON.stringify([
      { name: 'Shopify', sector: 'SaaS', stage: 'Growth', outcome: 'Public $80B+' },
      { name: 'Databricks', sector: 'AI/ML', stage: 'Growth', outcome: '$43B valuation' },
      { name: 'Monday.com', sector: 'SaaS', stage: 'Growth', outcome: 'Public $10B+' },
      { name: 'Wiz', sector: 'Security', stage: 'Growth', outcome: '$12B valuation' }
    ]),
    ownershipTarget: '10-15%',
    valueAddTags: JSON.stringify(['Insight Onsite', 'Sales Support', 'Recruiting', 'Analytics', 'Growth Team']),
    ethicsTags: JSON.stringify(['Growth-focused', 'Operational']),
    personalityType: 'growth-operator',
    decisionSpeed: '4-8 weeks',
    responsivenessScore: 86,
    applicationUrl: 'https://www.insightpartners.com/contact',
  },

  // Battery Ventures
  {
    email: 'info@battery.com',
    name: 'Battery Partner',
    firmName: 'Battery Ventures',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Series B', 'Growth']),
    checkMin: 100,
    checkMax: 50000,
    sectors: JSON.stringify(['AI/ML', 'Enterprise', 'SaaS', 'Fintech', 'E-commerce', 'Healthcare', 'Security']),
    geoFocus: JSON.stringify(['Global', 'Boston', 'SF']),
    leadFollow: 'either',
    fundSize: '$8B+ Multi-stage',
    fundType: 'institutional',
    thesis: 'Broad tech with thematic sectors (Enterprise Software Team, etc.). Hands-on research and executive network. Seed to buyout flexibility.',
    proofPoints: JSON.stringify({
      'All': ['Thematic fit', 'Executive network access', 'Research-backed']
    }),
    portfolio: JSON.stringify([
      { name: 'Wayfair', sector: 'E-commerce', stage: 'Growth', outcome: 'Public $10B+' },
      { name: 'Databricks', sector: 'AI/ML', stage: 'Growth', outcome: '$43B valuation' },
      { name: 'Coinbase', sector: 'Fintech', stage: 'Series A', outcome: 'Public $40B+' },
      { name: 'Modern Health', sector: 'Healthcare', stage: 'Series A', outcome: '$1.2B valuation' }
    ]),
    ownershipTarget: '10-20%',
    valueAddTags: JSON.stringify(['Thematic Teams', 'Executive Network', 'Research', 'Multi-stage Support']),
    ethicsTags: JSON.stringify(['Research-driven', 'Flexible']),
    personalityType: 'thematic-focused',
    decisionSpeed: '3-6 weeks',
    responsivenessScore: 85,
    applicationUrl: 'https://www.battery.com/contact',
  },

  // Thrive Capital
  {
    email: 'team@thrivecap.com',
    name: 'Thrive Partner',
    firmName: 'Thrive Capital',
    verified: true,
    stages: JSON.stringify(['Series A', 'Series B', 'Growth']),
    checkMin: 500,
    checkMax: 50000,
    sectors: JSON.stringify(['SaaS', 'AI/ML', 'Fintech', 'Marketplace', 'Consumer']),
    geoFocus: JSON.stringify(['US', 'Global']),
    leadFollow: 'lead',
    fundSize: '$15B+ Growth',
    fundType: 'institutional',
    thesis: 'Growth and late-stage in software/marketplaces. PR/connections support (media ties). Focus on internet companies and fintech.',
    proofPoints: JSON.stringify({
      'All': ['Growth traction', 'PR/media readiness', 'Marketplace dynamics', 'Scale potential']
    }),
    portfolio: JSON.stringify([
      { name: 'Instagram', sector: 'Consumer', stage: 'Early', outcome: 'Acquired $1B' },
      { name: 'GitHub', sector: 'Developer Tools', stage: 'Growth', outcome: 'Acquired $7.5B' },
      { name: 'Stripe', sector: 'Fintech', stage: 'Growth', outcome: '$95B valuation' },
      { name: 'OpenAI', sector: 'AI/ML', stage: 'Growth', outcome: '$157B valuation' }
    ]),
    ownershipTarget: '10-15%',
    valueAddTags: JSON.stringify(['PR Support', 'Media Connections', 'Growth Focus', 'Network']),
    ethicsTags: JSON.stringify(['Growth-stage', 'Connected']),
    personalityType: 'growth-media',
    decisionSpeed: '4-8 weeks',
    responsivenessScore: 84,
    applicationUrl: 'https://thrivecap.com/contact',
  },

  // Spark Capital
  {
    email: 'hello@sparkcapital.com',
    name: 'Spark Partner',
    firmName: 'Spark Capital',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Series B']),
    checkMin: 1000,
    checkMax: 10000,
    sectors: JSON.stringify(['Consumer', 'AI/ML', 'Fintech', 'Marketplace', 'Crypto/Web3']),
    geoFocus: JSON.stringify(['US', 'SF', 'Boston', 'NYC']),
    leadFollow: 'lead',
    fundSize: '$4B+ Early-Growth',
    fundType: 'institutional',
    thesis: 'Consumer internet and deep tech. Technical depth + design/marketing vision. "Creator ethos" with multi-office presence.',
    proofPoints: JSON.stringify({
      'All': ['Technical + design vision', 'Creator mindset', 'Multi-disciplinary team']
    }),
    portfolio: JSON.stringify([
      { name: 'Coinbase', sector: 'Crypto', stage: 'Series A', outcome: 'Public $40B+' },
      { name: 'Snap', sector: 'Consumer', stage: 'Series A', outcome: 'Public $25B+' },
      { name: 'Discord', sector: 'Consumer', stage: 'Series A', outcome: '$15B valuation' },
      { name: 'Affirm', sector: 'Fintech', stage: 'Series A', outcome: 'Public $10B+' }
    ]),
    ownershipTarget: '15-20%',
    valueAddTags: JSON.stringify(['Creator Support', 'Multi-office', 'Design Help', 'Technical Depth']),
    ethicsTags: JSON.stringify(['Creator-friendly', 'Design-focused']),
    personalityType: 'creator-technical',
    decisionSpeed: '3-5 weeks',
    responsivenessScore: 88,
    applicationUrl: 'https://www.sparkcapital.com/contact',
  },

  // Techstars
  {
    email: 'apply@techstars.com',
    name: 'Techstars Team',
    firmName: 'Techstars',
    verified: true,
    stages: JSON.stringify(['Pre-Seed']),
    checkMin: 20,
    checkMax: 120,
    sectors: JSON.stringify(['SaaS', 'Fintech', 'Healthcare', 'IoT', 'Enterprise', 'AI/ML']),
    geoFocus: JSON.stringify(['Global', 'Various Cities']),
    leadFollow: 'either',
    fundSize: 'Accelerator Network',
    fundType: 'accelerator',
    thesis: '13-week accelerator with 500+ mentors globally. Themes vary by program (health, fintech, IoT). Investor exposure, co-working, ongoing support.',
    proofPoints: JSON.stringify({
      'All': ['MVP or prototype', 'Coachable founders', 'Program fit', 'Mentor receptiveness']
    }),
    portfolio: JSON.stringify([
      { name: 'ClassPass', sector: 'Consumer', stage: 'Pre-seed', outcome: 'Acquired $1B' },
      { name: 'DigitalOcean', sector: 'Infrastructure', stage: 'Pre-seed', outcome: 'Public $5B+' },
      { name: 'SendGrid', sector: 'SaaS', stage: 'Pre-seed', outcome: 'Acquired $3B' },
      { name: 'Sphero', sector: 'Hardware', stage: 'Pre-seed', outcome: '$100M+ revenue' }
    ]),
    ownershipTarget: '~6-7%',
    valueAddTags: JSON.stringify(['13-Week Program', '500+ Mentors', 'Investor Exposure', 'Global Network']),
    ethicsTags: JSON.stringify(['Mentor-driven', 'Community']),
    personalityType: 'mentor-network',
    decisionSpeed: 'Program cycle (apply by deadline)',
    responsivenessScore: 90,
    applicationUrl: 'https://www.techstars.com/accelerators',
  },

  // 500 Global (formerly 500 Startups)
  {
    email: 'hello@500.co',
    name: '500 Global Partner',
    firmName: '500 Global',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkMin: 50,
    checkMax: 3000,
    sectors: JSON.stringify(['Fintech', 'Marketplace', 'SaaS', 'Healthcare', 'Crypto/Web3', 'AI/ML']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'either',
    fundSize: '$2.7B+ Early-stage',
    fundType: 'accelerator',
    thesis: 'Early-stage fund + accelerator. Virtual programs with multi-stage support. 500+ mentors, LPs. Global network focus.',
    proofPoints: JSON.stringify({
      'All': ['Global ambition', 'Program receptiveness', 'Diverse backgrounds welcome']
    }),
    portfolio: JSON.stringify([
      { name: 'Canva', sector: 'SaaS', stage: 'Seed', outcome: '$40B valuation' },
      { name: 'Talkdesk', sector: 'SaaS', stage: 'Seed', outcome: '$10B valuation' },
      { name: 'Grab', sector: 'Marketplace', stage: 'Seed', outcome: 'Public $10B+' },
      { name: 'Udemy', sector: 'EdTech', stage: 'Seed', outcome: 'Public $3B+' }
    ]),
    ownershipTarget: '5-10%',
    valueAddTags: JSON.stringify(['Global Network', 'Mentors', 'Demo Days', 'Multi-stage Support']),
    ethicsTags: JSON.stringify(['Global', 'Diverse']),
    personalityType: 'global-network',
    decisionSpeed: 'Program cycle',
    responsivenessScore: 87,
    applicationUrl: 'https://500.co/accelerators',
  },

  // Initialized Capital
  {
    email: 'team@initialized.com',
    name: 'Initialized Partner',
    firmName: 'Initialized Capital',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A']),
    checkMin: 500,
    checkMax: 10000,
    sectors: JSON.stringify(['SaaS', 'Fintech', 'Consumer', 'Enterprise', 'Developer Tools']),
    geoFocus: JSON.stringify(['US', 'SF']),
    leadFollow: 'lead',
    fundSize: '$1B+ Early-stage',
    fundType: 'institutional',
    thesis: 'Technical founders (engineers/designers) building B2B or B2C software. Co-founded by Reddit\'s Alexis Ohanian. Founder-centric with tight network.',
    proofPoints: JSON.stringify({
      'All': ['Technical founder', 'Product-first', 'Strong founding story']
    }),
    portfolio: JSON.stringify([
      { name: 'Instacart', sector: 'Marketplace', stage: 'Seed', outcome: 'Public $10B+' },
      { name: 'Flexport', sector: 'Enterprise', stage: 'Seed', outcome: '$8B valuation' },
      { name: 'Rippling', sector: 'SaaS', stage: 'Seed', outcome: '$11B valuation' },
      { name: 'Ro', sector: 'Healthcare', stage: 'Seed', outcome: '$7B valuation' }
    ]),
    ownershipTarget: '10-15%',
    valueAddTags: JSON.stringify(['Founder-centric', 'Technical Network', 'Reddit Connection']),
    ethicsTags: JSON.stringify(['Technical-first', 'Founder-friendly']),
    personalityType: 'technical-founder',
    decisionSpeed: '2-4 weeks',
    responsivenessScore: 89,
    applicationUrl: 'https://initialized.com/contact',
  },

  // Homebrew
  {
    email: 'hello@homebrew.co',
    name: 'Homebrew Partner',
    firmName: 'Homebrew',
    verified: true,
    stages: JSON.stringify(['Seed']),
    checkMin: 500,
    checkMax: 3000,
    sectors: JSON.stringify(['Fintech', 'Consumer', 'E-commerce', 'Enterprise', 'AI/ML', 'Crypto/Web3']),
    geoFocus: JSON.stringify(['US', 'SF']),
    leadFollow: 'lead',
    fundSize: '$300M Seed',
    fundType: 'seed',
    thesis: 'Mission-driven "bottom-up economy" founders. Ambitious, resourceful teams with software + domain expertise. Ex-Google partners with deep operational support.',
    proofPoints: JSON.stringify({
      'All': ['Mission-driven', 'Bottom-up approach', 'Resourcefulness', 'Domain + tech expertise']
    }),
    portfolio: JSON.stringify([
      { name: 'Chime', sector: 'Fintech', stage: 'Seed', outcome: '$25B valuation' },
      { name: 'Gusto', sector: 'SaaS', stage: 'Seed', outcome: '$10B valuation' },
      { name: 'Color Genomics', sector: 'Healthcare', stage: 'Seed', outcome: '$4.6B valuation' },
      { name: 'Bowery Farming', sector: 'Climate Tech', stage: 'Seed', outcome: '$500M+ valuation' }
    ]),
    ownershipTarget: '10-15%',
    valueAddTags: JSON.stringify(['Operational Support', 'Ex-Google Network', 'Active Mentorship']),
    ethicsTags: JSON.stringify(['Mission-driven', 'Bottom-up economy']),
    personalityType: 'mission-operator',
    decisionSpeed: '2-4 weeks',
    responsivenessScore: 90,
    applicationUrl: 'https://www.homebrew.co',
  },

  // SV Angel
  {
    email: 'team@svangel.com',
    name: 'SV Angel Team',
    firmName: 'SV Angel',
    verified: true,
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkMin: 100,
    checkMax: 1000,
    sectors: JSON.stringify(['SaaS', 'Consumer', 'Fintech', 'AI/ML', 'Marketplace']),
    geoFocus: JSON.stringify(['US', 'SF']),
    leadFollow: 'either',
    fundSize: 'Angel Syndicate',
    fundType: 'angel',
    thesis: 'Angel/seed syndicate. Ron Conway\'s famous network. Access to prolific network and business advice. Portfolio approach.',
    proofPoints: JSON.stringify({
      'All': ['Network access', 'Early potential', 'SF ecosystem fit']
    }),
    portfolio: JSON.stringify([
      { name: 'Snap', sector: 'Consumer', stage: 'Seed', outcome: 'Public $25B+' },
      { name: 'Coinbase', sector: 'Crypto', stage: 'Seed', outcome: 'Public $40B+' },
      { name: 'GitHub', sector: 'Developer Tools', stage: 'Seed', outcome: 'Acquired $7.5B' },
      { name: 'Flexport', sector: 'Enterprise', stage: 'Seed', outcome: '$8B valuation' }
    ]),
    ownershipTarget: '3-7%',
    valueAddTags: JSON.stringify(['Ron Conway Network', 'Angel Connections', 'Business Advice', 'SF Ecosystem']),
    ethicsTags: JSON.stringify(['Network-first', 'Angel-friendly']),
    personalityType: 'network-angel',
    decisionSpeed: '1-2 weeks (fast)',
    responsivenessScore: 91,
    applicationUrl: 'https://svangel.com',
  },

  // Felicis Ventures
  {
    email: 'team@felicis.com',
    name: 'Felicis Partner',
    firmName: 'Felicis Ventures',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Growth']),
    checkMin: 1000,
    checkMax: 10000,
    sectors: JSON.stringify(['AI/ML', 'Crypto/Web3', 'Fintech', 'Healthcare', 'SaaS']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$2B+ Multi-stage',
    fundType: 'institutional',
    thesis: 'Thematic focus on AI, crypto, genomics, fintech. Bold founders tackling transformative opportunities. Seed to growth flexibility.',
    proofPoints: JSON.stringify({
      'All': ['Bold vision', 'Thematic fit', 'Transformation potential']
    }),
    portfolio: JSON.stringify([
      { name: 'Shopify', sector: 'SaaS', stage: 'Series A', outcome: 'Public $80B+' },
      { name: 'Adyen', sector: 'Fintech', stage: 'Series A', outcome: 'Public $50B+' },
      { name: 'Canva', sector: 'SaaS', stage: 'Series A', outcome: '$40B valuation' },
      { name: 'Guardant Health', sector: 'Biotech', stage: 'Series A', outcome: 'Public $5B+' }
    ]),
    ownershipTarget: '10-15%',
    valueAddTags: JSON.stringify(['Thematic Expertise', 'Bold Vision Support', 'Multi-stage']),
    ethicsTags: JSON.stringify(['Bold', 'Transformative']),
    personalityType: 'thematic-bold',
    decisionSpeed: '3-5 weeks',
    responsivenessScore: 88,
    applicationUrl: 'https://www.felicis.com/contact',
  },

  // DCVC (Data Collective)
  {
    email: 'info@dcvc.com',
    name: 'DCVC Partner',
    firmName: 'Data Collective',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Growth']),
    checkMin: 1000,
    checkMax: 15000,
    sectors: JSON.stringify(['AI/ML', 'DeepTech', 'Robotics', 'Space', 'Healthcare', 'Manufacturing']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$6B+ Deep Tech',
    fundType: 'institutional',
    thesis: 'Deep tech and AI across sectors. Robotics, space, genomics, advanced manufacturing. PhD founders with technical breakthroughs. PhD advisors.',
    proofPoints: JSON.stringify({
      'All': ['PhD-level technical depth', 'Scientific breakthrough', 'Deep tech moat', 'Academic rigor']
    }),
    portfolio: JSON.stringify([
      { name: 'Planet Labs', sector: 'Space', stage: 'Series A', outcome: 'Public $2B+' },
      { name: 'Rocket Lab', sector: 'Aerospace', stage: 'Series A', outcome: 'Public $5B+' },
      { name: 'Zymergen', sector: 'Biotech', stage: 'Series A', outcome: 'Public (delisted)' },
      { name: 'Relation Therapeutics', sector: 'Biotech', stage: 'Series A', outcome: 'Active' }
    ]),
    ownershipTarget: '10-20%',
    valueAddTags: JSON.stringify(['PhD Advisors', 'Deep Tech Community', 'Scientific Network', 'Technical Support']),
    ethicsTags: JSON.stringify(['Scientific-first', 'Deep tech']),
    personalityType: 'scientific-technical',
    decisionSpeed: '6-10 weeks (deep diligence)',
    responsivenessScore: 83,
    applicationUrl: 'https://www.dcvc.com/contact',
  },

  // Lux Capital
  {
    email: 'team@luxcapital.com',
    name: 'Lux Partner',
    firmName: 'Lux Capital',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Series B', 'Growth']),
    checkMin: 100,
    checkMax: 50000,
    sectors: JSON.stringify(['AI/ML', 'Biotech', 'Aerospace', 'DeepTech', 'Security']),
    geoFocus: JSON.stringify(['Global']),
    leadFollow: 'lead',
    fundSize: '$1.15B+ Frontier Tech',
    fundType: 'institutional',
    thesis: 'Deep science & frontier tech. "Sci-fi" companies in AI, biotech (inner space), aerospace/defense (outer space), advanced computing. First $100K to $100M support.',
    proofPoints: JSON.stringify({
      'All': ['Sci-fi vision', 'Scientific breakthrough', 'Frontier technology', 'Long-term thinking']
    }),
    portfolio: JSON.stringify([
      { name: 'Anduril', sector: 'Defense', stage: 'Series A', outcome: '$14B valuation' },
      { name: 'Applied Intuition', sector: 'AI/ML', stage: 'Series A', outcome: '$6B valuation' },
      { name: 'Hugging Face', sector: 'AI/ML', stage: 'Series B', outcome: '$4.5B valuation' },
      { name: 'RunwayML', sector: 'AI/ML', stage: 'Series A', outcome: '$1.5B valuation' }
    ]),
    ownershipTarget: '10-20%',
    valueAddTags: JSON.stringify(['Frontier Tech', 'Scientific Support', 'Long-term Partner', 'Moonshot Friendly']),
    ethicsTags: JSON.stringify(['Sci-fi vision', 'Long-term']),
    personalityType: 'frontier-scientific',
    decisionSpeed: '4-8 weeks',
    responsivenessScore: 86,
    applicationUrl: 'https://www.luxcapital.com/contact',
  },

  // Redpoint Ventures
  {
    email: 'info@redpoint.com',
    name: 'Redpoint Partner',
    firmName: 'Redpoint Ventures',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A', 'Growth']),
    checkMin: 5000,
    checkMax: 20000,
    sectors: JSON.stringify(['SaaS', 'Cloud', 'Consumer', 'Fintech', 'AI/ML']),
    geoFocus: JSON.stringify(['US', 'Global']),
    leadFollow: 'lead',
    fundSize: '$7B+ Multi-stage',
    fundType: 'institutional',
    thesis: 'Cloud, consumer, fintech, and emerging tech. Focus on market-defining companies with strong product-market fit.',
    proofPoints: JSON.stringify({
      'All': ['Market-defining potential', 'Strong PMF', 'Cloud-native', 'Category leadership']
    }),
    portfolio: JSON.stringify([
      { name: 'Stripe', sector: 'Fintech', stage: 'Series A', outcome: '$95B valuation' },
      { name: 'Twilio', sector: 'Developer Tools', stage: 'Series A', outcome: 'Public $10B+' },
      { name: 'Snowflake', sector: 'Enterprise', stage: 'Series A', outcome: 'Public $50B+' },
      { name: 'Netflix', sector: 'Consumer', stage: 'Early', outcome: 'Public $200B+' }
    ]),
    ownershipTarget: '15-20%',
    valueAddTags: JSON.stringify(['Cloud Expertise', 'Category Creation', 'Product Support', 'Market Strategy']),
    ethicsTags: JSON.stringify(['Product-first', 'Category-defining']),
    personalityType: 'category-creator',
    decisionSpeed: '4-6 weeks',
    responsivenessScore: 87,
    applicationUrl: 'https://www.redpoint.com/contact',
  },

  // True Ventures
  {
    email: 'team@trueventures.com',
    name: 'True Partner',
    firmName: 'True Ventures',
    verified: true,
    stages: JSON.stringify(['Seed', 'Series A']),
    checkMin: 1000,
    checkMax: 5000,
    sectors: JSON.stringify(['Consumer', 'Enterprise', 'SaaS', 'Hardware', 'IoT']),
    geoFocus: JSON.stringify(['US', 'SF']),
    leadFollow: 'lead',
    fundSize: '$2.5B+ Early-stage',
    fundType: 'institutional',
    thesis: 'Consumer internet, mobile, cloud services. Focus on founder community and long-term partnerships. Hardware-friendly.',
    proofPoints: JSON.stringify({
      'All': ['Founder community fit', 'Long-term vision', 'Product innovation']
    }),
    portfolio: JSON.stringify([
      { name: 'Peloton', sector: 'Consumer', stage: 'Seed', outcome: 'Public $10B+' },
      { name: 'Fitbit', sector: 'Hardware', stage: 'Seed', outcome: 'Acquired $2.1B' },
      { name: 'Ring', sector: 'IoT', stage: 'Seed', outcome: 'Acquired $1B' },
      { name: 'Blue Bottle', sector: 'Consumer', stage: 'Seed', outcome: 'Acquired $700M+' }
    ]),
    ownershipTarget: '10-15%',
    valueAddTags: JSON.stringify(['Founder Community', 'Long-term Partner', 'Hardware Support', 'Consumer Expertise']),
    ethicsTags: JSON.stringify(['Community-first', 'Founder-friendly']),
    personalityType: 'community-focused',
    decisionSpeed: '3-5 weeks',
    responsivenessScore: 89,
    applicationUrl: 'https://www.trueventures.com/contact',
  },
]

// Export both named and default
export default eliteVCs

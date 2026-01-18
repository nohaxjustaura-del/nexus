/**
 * Update VC information with accurate, researched data
 * Based on web research conducted January 2026
 */

import { db } from '../lib/db'

const accurateVCData = {
  'Y Combinator': {
    firmName: 'Y Combinator',
    fundType: 'accelerator',
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkSizeMin: 500, // $500K total investment
    checkSizeMax: 500,
    thesis: `Y Combinator is the world's leading startup accelerator. Standard deal: $500K total ($125K for 7% equity + $375K uncapped SAFE with MFN). Runs 4 batches per year. Focuses on founders working full-time with strong technical/domain background, clear product-market fit signals, and large market potential. Recent batches show median seed rounds of $3.1M after Demo Day. Notable portfolio: Airbnb, Stripe, Coinbase, DoorDash, Instacart.`,
    geography: JSON.stringify(['Global']),
    sectors: JSON.stringify(['All Sectors', 'Software', 'AI/ML', 'B2B SaaS', 'Consumer', 'Fintech', 'Healthcare']),
  },
  'Sequoia Capital': {
    firmName: 'Sequoia Capital',
    fundType: 'institutional',
    stages: JSON.stringify(['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Growth']),
    checkSizeMin: 500, // $500K-$1M for seed/pre-seed
    checkSizeMax: 15000, // $15M+ for Series A
    thesis: `Sequoia Capital is a top-tier institutional VC with $200M seed fund and $750M Series A fund (announced Oct 2025). Seed/pre-seed checks: $500K-$1M. Series A: typically $5M-$15M+. Runs "Arc" program for pre-seed founders with workshops and mentorship. Looks for founders with unusual insights, large/growing markets, and willingness to invest at idea stage. Notable portfolio: WhatsApp, Instagram, YouTube, Zoom, Robinhood. Focus: AI/ML, security, developer tools, infrastructure.`,
    geography: JSON.stringify(['US', 'Global']),
    sectors: JSON.stringify(['Enterprise', 'AI/ML', 'Security', 'Developer Tools', 'Infrastructure', 'Consumer']),
  },
  'Andreessen Horowitz': {
    firmName: 'Andreessen Horowitz',
    fundType: 'institutional',
    stages: JSON.stringify(['Seed', 'Series A', 'Series B', 'Growth']),
    checkSizeMin: 3000, // $3M-$5M for seed
    checkSizeMax: 20000, // $20M for Series A
    thesis: `Andreessen Horowitz (a16z) is a leading multi-stage VC with $15B+ in new funds (2025). Seed checks: $3M-$5M. Series A: $10M-$20M. Funds: Apps ($1.7B), Infrastructure ($1.7B), American Dynamism/defense ($1.176B), Bio & Health ($700M), Growth ($6.75B). Focus: AI, crypto, infrastructure, defense/security, biology, health. Mission: "America wins the next 100 years of technology." Notable portfolio: Facebook, Slack, GitHub, Coinbase, Oculus.`,
    geography: JSON.stringify(['US', 'Global']),
    sectors: JSON.stringify(['AI/ML', 'Crypto', 'Infrastructure', 'Defense/Security', 'Bio/Health', 'Enterprise', 'Consumer']),
  },
  '1517 Fund': {
    firmName: '1517 Fund',
    fundType: 'micro-VC',
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkSizeMin: 100, // $100K for idea/R&D
    checkSizeMax: 1000, // $1M for deep tech seed
    thesis: `1517 Fund backs founders without traditional credentials: dropouts, self-taught builders, renegade students. ~15% portfolio in "sci-fi" deep tech. Idea/R&D: $100K. Pre-seed: $500K. Deep tech seed: up to $1M. Focus on unconventional paths and long R&D horizons. Named after year Martin Luther posted 95 Theses. Emphasis on community, long-term relationships, and continuous founder support. Notable: Vitalik Buterin (Ethereum), Dylan Field (Figma), Ritesh Agarwal (OYO).`,
    geography: JSON.stringify(['US', 'Global']),
    sectors: JSON.stringify(['Deep Tech', 'AI/ML', 'Crypto', 'Hard Tech', 'Frontier Tech', 'All Sectors']),
  },
  'Dorm Room Fund': {
    firmName: 'Dorm Room Fund',
    fundType: 'micro-VC',
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkSizeMin: 40, // $40K for very early pre-seed
    checkSizeMax: 250, // $250K for student startups
    thesis: `Dorm Room Fund invests exclusively in student-founded startups. Check sizes: $40K for early pre-seed, $90K-$250K for student-led companies. Backed by First Round Capital. Looks for students building while in school with campus traction. Portfolio includes founders from Harvard, MIT, Stanford, Berkeley, Yale, and other top universities. Focus: student founders with hustle, early traction, and commitment to building.`,
    geography: JSON.stringify(['US']),
    sectors: JSON.stringify(['All Sectors', 'Software', 'AI/ML', 'Consumer', 'EdTech', 'B2B SaaS']),
  },
  'Benchmark': {
    firmName: 'Benchmark',
    fundType: 'institutional',
    stages: JSON.stringify(['Seed', 'Series A', 'Series B']),
    checkSizeMin: 1000, // $1M-$3M seed, $8M-$15M Series A
    checkSizeMax: 15000,
    thesis: `Benchmark Capital is an elite-tier VC with $425M 11th fund (2024). Seed checks: $1M-$3M. Series A: $8M-$15M. Focuses on ~20% ownership when leading. Small, flat partner structure with equal economics. Focus: Consumer, Enterprise/SaaS, Marketplaces, AI/ML. Primarily US/Silicon Valley. Notable portfolio: Uber, Twitter, Instagram, Snapchat.`,
    geography: JSON.stringify(['US']),
    sectors: JSON.stringify(['Consumer', 'Enterprise', 'SaaS', 'Marketplaces', 'AI/ML', 'Security', 'Infrastructure']),
  },
  'Accel': {
    firmName: 'Accel',
    fundType: 'institutional',
    stages: JSON.stringify(['Seed', 'Series A', 'Series B']),
    checkSizeMin: 2000, // $2M-$5M seed, $8M-$15M Series A
    checkSizeMax: 15000,
    thesis: `Accel Partners is a leading multi-stage VC. Seed checks: $2M-$5M (average $4.48M). Series A: $8M-$15M (average $10M). Series B: $25M-$50M+. Focus: Enterprise, Consumer, Fintech, Marketplaces. Notable portfolio: Facebook, Slack, Dropbox, Atlassian, CrowdStrike.`,
    geography: JSON.stringify(['US', 'Global']),
    sectors: JSON.stringify(['Enterprise', 'Consumer', 'Fintech', 'Marketplaces', 'SaaS', 'Security']),
  },
  'First Round Capital': {
    firmName: 'First Round Capital',
    fundType: 'VC',
    stages: JSON.stringify(['Pre-Seed', 'Seed']),
    checkSizeMin: 500, // $500K-$1M early, $1M-$3M typical seed
    checkSizeMax: 3000,
    thesis: `First Round Capital is a seed-stage VC firm, often the first institutional investor. Typical seed checks: $1M-$3M when leading. Very early pre-seed: $500K-$1M. Focus: Seed-stage companies, provides support over first ~18 months. Notable portfolio: Uber, Square, Roblox, Notion.`,
    geography: JSON.stringify(['US']),
    sectors: JSON.stringify(['All Sectors', 'Software', 'SaaS', 'Marketplaces', 'Consumer', 'Enterprise']),
  },
  'Lightspeed Venture Partners': {
    firmName: 'Lightspeed Venture Partners',
    fundType: 'institutional',
    stages: JSON.stringify(['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Growth']),
    checkSizeMin: 500, // $500K-$2M pre-seed, $1M-$10M seed, $7M-$12M Series A
    checkSizeMax: 25000,
    thesis: `Lightspeed Venture Partners is a multi-stage VC with $9B+ in new funds (2025). Pre-seed: $500K-$2M. Seed: $1M-$10M. Series A: $7M-$12M. Series B/Growth: $10M-$25M+. Focus: Enterprise software, fintech, consumer tech, healthcare, AI/deep tech. Global presence: US, India, Israel, Europe, Southeast Asia.`,
    geography: JSON.stringify(['US', 'Global', 'India', 'Israel', 'Europe']),
    sectors: JSON.stringify(['Enterprise', 'Fintech', 'Consumer', 'Healthcare', 'AI/ML', 'Deep Tech']),
  },
  'Index Ventures': {
    firmName: 'Index Ventures',
    fundType: 'institutional',
    stages: JSON.stringify(['Seed', 'Series A', 'Series B', 'Growth']),
    checkSizeMin: 1000, // $1M-$10M seed, $8M-$15M Series A
    checkSizeMax: 15000,
    thesis: `Index Ventures raised $2.3B in new funds (2024): $800M venture/early-stage, $1.5B growth. Index Origin II seed fund: $300M. Seed checks: $5M-$10M (sometimes $1M-$3M for less mature). Series A: $8M-$15M. Focus: Enterprise, Consumer, Fintech, AI. Notable portfolio: Adyen, Dropbox, Etsy, Figma, Roblox.`,
    geography: JSON.stringify(['US', 'Europe', 'Global']),
    sectors: JSON.stringify(['Enterprise', 'Consumer', 'Fintech', 'AI/ML', 'SaaS', 'Marketplaces']),
  },
}

async function main() {
  console.log('🔄 Updating VC data with accurate research...\n')
  
  let updated = 0
  let notFound = 0
  
  for (const [vcName, data] of Object.entries(accurateVCData)) {
    try {
      // Find the VC by firm name
      const existing = await db.investor.findFirst({
        where: {
          firmName: vcName,
        },
      })
      
      if (existing) {
        await db.investor.update({
          where: { id: existing.id },
          data: {
            ...data,
            verified: true,
          },
        })
        console.log(`✅ Updated: ${vcName}`)
        updated++
      } else {
        console.log(`⚠️  Not found: ${vcName}`)
        notFound++
      }
    } catch (error: any) {
      console.error(`❌ Error updating ${vcName}:`, error.message)
    }
  }
  
  console.log(`\n📊 Summary:`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Not found: ${notFound}`)
  console.log(`\n✅ VC accuracy update complete!`)
}

main()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

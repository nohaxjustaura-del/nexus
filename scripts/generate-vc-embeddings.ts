/**
 * Generate and store embeddings for all VCs in the database
 * Uses Google Gemini's text-embedding-004 model
 * Run this script to pre-compute VC embeddings for fast Smart Match
 * 
 * Usage: npm run generate-vc-embeddings
 * 
 * Requirements: GEMINI_API_KEY or GOOGLE_API_KEY in .env.local
 */

import { db as prisma } from '../lib/db'
import { generateVCEmbedding } from '../lib/embeddings'
import { parseJSON } from '../lib/utils'

async function main() {
  console.log('🚀 Starting VC embedding generation...\n')

  // Get all verified, public VCs
  const investors = await prisma.investor.findMany({
    where: {
      verified: true,
      isPublic: true,
    },
    select: {
      id: true,
      firmName: true,
      fundType: true,
      stages: true,
      sectors: true,
      geography: true,
      geoFocus: true,
      checkSizeMin: true,
      checkSizeMax: true,
      leadFollow: true,
      thesis: true,
      valueAddTags: true,
      portfolio: true,
      notableInvestments: true,
      embedding: true,
    },
  })

  console.log(`Found ${investors.length} investors\n`)

  let generated = 0
  let skipped = 0
  let errors = 0

  for (const investor of investors) {
    try {
      // Skip if already has embedding (unless you want to regenerate)
      if (investor.embedding) {
        console.log(`⏭️  Skipping ${investor.firmName} (already has embedding)`)
        skipped++
        continue
      }

      console.log(`🔄 Generating embedding for ${investor.firmName}...`)

      // Build VC profile
      const vcProfile = {
        firmName: investor.firmName,
        fundType: investor.fundType,
        stages: parseJSON<string[]>(investor.stages, []),
        sectors: parseJSON<string[]>(investor.sectors, []),
        geography: parseJSON<string[]>(investor.geography || investor.geoFocus, []),
        checkSizeMin: investor.checkSizeMin,
        checkSizeMax: investor.checkSizeMax,
        leadFollow: investor.leadFollow,
        thesis: investor.thesis || undefined,
        valueAddTags: parseJSON<string[]>(investor.valueAddTags, []),
        portfolio: parseJSON<any[]>(investor.portfolio, [])
          .map((p: any) => (typeof p === 'string' ? p : p.name || p.company))
          .filter(Boolean),
        notableInvestments: parseJSON<string[]>(investor.notableInvestments, []),
      }

      // Generate embedding
      const embedding = await generateVCEmbedding(vcProfile)

      // Store in database
      await prisma.investor.update({
        where: { id: investor.id },
        data: {
          embedding: JSON.stringify(embedding),
        },
      })

      console.log(`✅ Generated embedding for ${investor.firmName}`)
      generated++

      // Rate limiting - wait 200ms between requests for Gemini
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (error: any) {
      console.error(`❌ Error generating embedding for ${investor.firmName}:`, error.message)
      errors++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total investors: ${investors.length}`)
  console.log(`✅ Generated: ${generated}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`❌ Errors: ${errors}`)
  console.log('='.repeat(60))
  console.log('\n✨ VC embeddings generation complete!')
}

main()
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

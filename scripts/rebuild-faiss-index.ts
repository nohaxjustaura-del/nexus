/**
 * Rebuild FAISS index with current embedding model (1024 dimensions, Voyage AI)
 * This script:
 * 1. Generates embeddings for all VCs using Voyage AI voyage-3
 * 2. Builds FAISS index from those embeddings
 * 
 * Usage: npm run rebuild-faiss-index
 * Rate limits: 3 RPM, 10K TPM
 */

import { db } from '../lib/db'
import { generateVCEmbedding, buildVCEmbeddingText } from '../lib/embeddings'
import { parseJSON } from '../lib/utils'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

async function main() {
  console.log('🚀 Rebuilding FAISS index with 1024-dimensional embeddings (Voyage AI)...\n')
  console.log('⚠️  Voyage AI free tier: 3 req/min — this will take a while for large datasets\n')

  // Get all verified VCs
  const investors = await db.investor.findMany({
    where: {
      verified: true,
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
    },
  })

  console.log(`Found ${investors.length} investors\n`)

  if (investors.length === 0) {
    console.log('❌ No investors found')
    return
  }

  // Prepare data for FAISS index
  const vcData: any[] = []
  const embeddings: number[][] = []

  console.log('🔄 Generating embeddings for all VCs...\n')

  let apiCalls = 0

  for (let i = 0; i < investors.length; i++) {
    const investor = investors[i]
    
    try {
      console.log(`[${i + 1}/${investors.length}] Generating embedding for ${investor.firmName}...`)

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

      const embedding = await generateVCEmbedding(vcProfile)
      apiCalls++

      if (embedding.length !== 1024) {
        console.log(`⚠️  Warning: ${investor.firmName} has dimension ${embedding.length}, expected 1024`)
        continue
      }

      embeddings.push(embedding)

      const embeddingText = buildVCEmbeddingText(vcProfile)

      const vcEntry = {
        id: investor.id,
        firm_name: investor.firmName,
        embedding_text: embeddingText,
        metadata: {
          stages: vcProfile.stages,
          sectors: vcProfile.sectors,
          geography: vcProfile.geography,
          check_size: {
            min_usd: investor.checkSizeMin || 0,
            max_usd: investor.checkSizeMax || 0,
          },
          investor_type: investor.fundType || 'vc',
          thesis: investor.thesis || '',
        },
      }

      vcData.push(vcEntry)
    } catch (error: any) {
      console.error(`❌ Error processing ${investor.firmName}:`, error.message)
      apiCalls++
    }

    // Rate limiting OUTSIDE try/catch — applies after every API call
    if (apiCalls > 0 && apiCalls % 3 === 0) {
      console.log(`⏳ Rate-limit pause (60s) after ${apiCalls} API calls...`)
      await new Promise(resolve => setTimeout(resolve, 60_000))
    } else if (apiCalls > 0) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  if (embeddings.length === 0) {
    console.log('❌ No valid embeddings generated')
    return
  }

  console.log(`\n✅ Generated ${embeddings.length} embeddings (1024 dimensions each)\n`)

  // Write JSONL file for FAISS service
  const jsonlPath = join(process.cwd(), 'faiss-data', 'vcs_embedding_inputs_trimmed.json')
  const jsonlContent = vcData.map(vc => JSON.stringify(vc)).join('\n')
  writeFileSync(jsonlPath, jsonlContent, 'utf-8')
  console.log(`✅ Wrote VC data to ${jsonlPath}`)

  // Write embeddings as JSON for Python script
  const embeddingsPath = join(process.cwd(), 'faiss-data', 'embeddings.json')
  writeFileSync(embeddingsPath, JSON.stringify(embeddings), 'utf-8')
  console.log(`✅ Wrote embeddings to ${embeddingsPath}`)

  console.log('\n🔨 Building FAISS index...')
  
  // Run Python script to build index
  try {
    const pythonScript = join(process.cwd(), 'faiss-service', 'build_index.py')
    execSync(`python "${pythonScript}"`, { 
      cwd: process.cwd(),
      stdio: 'inherit'
    })
    console.log('\n✅ FAISS index rebuilt successfully!')
    console.log('   The index now uses 1024-dimensional embeddings (Voyage AI voyage-3)')
    console.log('   Restart the FAISS service to use the new index')
  } catch (error: any) {
    console.error('\n❌ Error building FAISS index:', error.message)
    console.log('\nYou can manually build it by running:')
    console.log('   cd faiss-service')
    console.log('   python build_index.py')
  }
}

main()
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
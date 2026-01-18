/**
 * Rebuild FAISS index with current embedding model (768 dimensions)
 * This script:
 * 1. Generates embeddings for all VCs using current model
 * 2. Builds FAISS index from those embeddings
 * 
 * Usage: npm run rebuild-faiss-index
 */

import { db } from '../lib/db'
import { generateVCEmbedding, buildVCEmbeddingText } from '../lib/embeddings'
import { parseJSON } from '../lib/utils'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

async function main() {
  console.log('🚀 Rebuilding FAISS index with 768-dimensional embeddings...\n')

  // Get all verified VCs (limit to first 200 for faster testing, remove limit for full rebuild)
  const investors = await db.investor.findMany({
    where: {
      verified: true,
    },
    take: 200, // Limit for faster testing - remove this line for full rebuild
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

  for (let i = 0; i < investors.length; i++) {
    const investor = investors[i]
    
    try {
      console.log(`[${i + 1}/${investors.length}] Generating embedding for ${investor.firmName}...`)

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

      // Verify dimension
      if (embedding.length !== 768) {
        console.log(`⚠️  Warning: ${investor.firmName} has dimension ${embedding.length}, expected 768`)
        continue
      }

      embeddings.push(embedding)

      // Build embedding text for reference
      const embeddingText = buildVCEmbeddingText(vcProfile)

      // Build VC data entry
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

      // Rate limiting - wait 200ms between requests
      if (i < investors.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${investor.firmName}:`, error.message)
    }
  }

  if (embeddings.length === 0) {
    console.log('❌ No valid embeddings generated')
    return
  }

  console.log(`\n✅ Generated ${embeddings.length} embeddings (768 dimensions each)\n`)

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
    console.log('   The index now uses 768-dimensional embeddings (Gemini text-embedding-004)')
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
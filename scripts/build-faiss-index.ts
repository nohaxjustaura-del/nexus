/**
 * Build FAISS index from VC embeddings
 * This script reads VC embeddings from the database and builds a FAISS index
 * 
 * Usage: npm run build-faiss-index
 * 
 * Requirements: 
 * - VC embeddings must be generated first (npm run generate-vc-embeddings)
 * - Python with faiss-cpu installed
 */

import { db } from '../lib/db'
import { parseJSON } from '../lib/utils'
import { writeFileSync } from 'fs'
import { join } from 'path'

async function main() {
  console.log('🚀 Building FAISS index from VC embeddings...\n')

  // Get all VCs with embeddings
  const investors = await db.investor.findMany({
    where: {
      verified: true,
      embedding: { not: null },
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

  console.log(`Found ${investors.length} investors with embeddings\n`)

  if (investors.length === 0) {
    console.log('❌ No embeddings found. Please run: npm run generate-vc-embeddings')
    return
  }

  // Prepare data for FAISS index
  const vcData: any[] = []
  const embeddings: number[][] = []

  for (const investor of investors) {
    if (!investor.embedding) continue

    try {
      const embedding = parseJSON<number[]>(investor.embedding, [])
      
      if (embedding.length === 0) {
        console.log(`⚠️  Skipping ${investor.firmName} - empty embedding`)
        continue
      }

      // Check embedding dimension (should be 768 for Gemini)
      if (embedding.length !== 768) {
        console.log(`⚠️  Skipping ${investor.firmName} - wrong dimension (${embedding.length}, expected 768)`)
        continue
      }

      embeddings.push(embedding)

      // Build VC data entry
      const vcEntry = {
        id: investor.id,
        firm_name: investor.firmName,
        embedding_text: '', // Will be populated if needed
        metadata: {
          stages: parseJSON<string[]>(investor.stages, []),
          sectors: parseJSON<string[]>(investor.sectors, []),
          geography: parseJSON<string[]>(investor.geography || investor.geoFocus, []),
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
    }
  }

  if (embeddings.length === 0) {
    console.log('❌ No valid embeddings found')
    return
  }

  console.log(`✅ Prepared ${embeddings.length} embeddings for FAISS index\n`)

  // Write JSONL file for Python script
  const jsonlPath = join(process.cwd(), 'faiss-data', 'vcs_embedding_inputs_trimmed.json')
  const jsonlContent = vcData.map(vc => JSON.stringify(vc)).join('\n')
  writeFileSync(jsonlPath, jsonlContent, 'utf-8')
  console.log(`✅ Wrote VC data to ${jsonlPath}`)

  // Write embeddings as JSON for Python script
  const embeddingsPath = join(process.cwd(), 'faiss-data', 'embeddings.json')
  writeFileSync(embeddingsPath, JSON.stringify(embeddings), 'utf-8')
  console.log(`✅ Wrote embeddings to ${embeddingsPath}`)

  console.log('\n📝 Next steps:')
  console.log('1. Run the Python script to build FAISS index:')
  console.log('   cd faiss-service')
  console.log('   python build_index.py')
  console.log('\nOr use the Node.js script (if available)')
}

main()
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
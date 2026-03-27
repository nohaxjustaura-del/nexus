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
import { EMBEDDING_DIMENSIONS } from '../lib/embeddings'
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

  // Smart Match + FAISS use voyage-3 pitch vectors (see lib/embeddings.ts). Always index that
  // dimension — do not pick "dominant" dim or legacy OpenAI 3072 rows will exclude new Voyage rows.
  const targetDim = EMBEDDING_DIMENSIONS
  const dimCounts = new Map<number, number>()
  for (const inv of investors) {
    if (!inv.embedding) continue
    const emb = parseJSON<number[]>(inv.embedding, [])
    if (emb.length === 0) continue
    dimCounts.set(emb.length, (dimCounts.get(emb.length) || 0) + 1)
  }
  const countTarget = dimCounts.get(targetDim) ?? 0
  const otherDims = [...dimCounts.entries()].filter(([d]) => d !== targetDim)
  const skippedWrongDim = investors.reduce((n, inv) => {
    if (!inv.embedding) return n
    const emb = parseJSON<number[]>(inv.embedding, [])
    return emb.length > 0 && emb.length !== targetDim ? n + 1 : n
  }, 0)

  console.log(
    `ℹ️  Building FAISS for pitch alignment: ${targetDim}-dim (Voyage voyage-3). ` +
      `${countTarget} investors match; ${skippedWrongDim} rows use other sizes (skipped).\n`
  )
  if (otherDims.length > 0) {
    const parts = otherDims.map(([d, c]) => `${c}×${d}d`).join(', ')
    console.log(
      `   Legacy / other in DB: ${parts}. Run npm run generate-vc-embeddings to replace with ${targetDim}-dim Voyage vectors.\n`,
    )
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

      if (embedding.length !== targetDim) {
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
    console.log(
      `❌ No ${targetDim}-dim embeddings found. Pitch + FAISS require Voyage-sized vectors.\n` +
        `   Run: npm run generate-vc-embeddings\n` +
        `   (Legacy 3072-dim rows must be re-embedded; they cannot be converted to 1024.)`,
    )
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
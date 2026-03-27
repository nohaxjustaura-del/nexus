/**
 * Generate and store embeddings for all VCs in the database (Voyage voyage-3, 1024-dim).
 * Skips investors that already have a valid 1024-d vector. Replaces legacy sizes (e.g. 3072)
 * by re-embedding VC profile text — old vectors are not mathematically convertible to Voyage space.
 *
 * Usage: npm run generate-vc-embeddings
 *
 * Requirements: VOYAGE_API_KEY. Restricted tier: 3 RPM — script sends up to 3 VCs per request
 * (~3× faster than one VC per request). Enable Voyage billing for higher RPM, or set
 * VOYAGE_MIN_REQUEST_INTERVAL_MS lower only if your org allows it.
 */

import { db as prisma } from '../lib/db'
import {
  buildVCEmbeddingText,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  generateBatchEmbeddings,
  VOYAGE_EMBEDDINGS_MIN_INTERVAL_MS,
} from '../lib/embeddings'
import { parseJSON } from '../lib/utils'

function formatVoyageSpacing(ms: number): string {
  if (ms <= 0) return 'no delay between requests'
  if (ms < 1000) return `${ms}ms between requests`
  return `≥${ms / 1000}s between requests`
}

async function main() {
  console.log('🚀 Starting VC embedding generation (Voyage AI)...\n')
  console.log(
    `   Model: ${EMBEDDING_MODEL}, ${EMBEDDING_DIMENSIONS} dims — up to 3 VCs per HTTP request, ` +
      `${formatVoyageSpacing(VOYAGE_EMBEDDINGS_MIN_INTERVAL_MS)}\n`,
  )

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

  type Row = (typeof investors)[number]
  const queue: { investor: Row; reason: string }[] = []

  for (const investor of investors) {
    if (investor.embedding) {
      try {
        const existing = JSON.parse(investor.embedding as string)
        if (Array.isArray(existing) && existing.length === EMBEDDING_DIMENSIONS) {
          continue
        }
        queue.push({
          investor,
          reason: `stored ${existing.length} dims; need ${EMBEDDING_DIMENSIONS} for ${EMBEDDING_MODEL}`,
        })
      } catch {
        queue.push({ investor, reason: 'invalid stored embedding' })
      }
    } else {
      queue.push({ investor, reason: 'missing embedding' })
    }
  }

  const skipped = investors.length - queue.length
  if (skipped > 0) {
    console.log(`⏭️  Skipping ${skipped} investors (already ${EMBEDDING_DIMENSIONS}-dim)\n`)
  }
  console.log(`📋 Queued ${queue.length} investors to embed\n`)

  let generated = 0
  let errors = 0

  const BATCH = 3
  for (let i = 0; i < queue.length; i += BATCH) {
    if (i > 0 && VOYAGE_EMBEDDINGS_MIN_INTERVAL_MS > 0) {
      await new Promise((r) => setTimeout(r, VOYAGE_EMBEDDINGS_MIN_INTERVAL_MS))
    }

    const slice = queue.slice(i, i + BATCH)
    for (const { investor, reason } of slice) {
      console.log(`🔄 ${investor.firmName} (${reason})`)
    }

    try {
      const texts = slice.map(({ investor }) =>
        buildVCEmbeddingText({
          firmName: investor.firmName ?? 'Unknown',
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
        }),
      )

      const vectors = await generateBatchEmbeddings(texts)

      for (let j = 0; j < slice.length; j++) {
        const { investor } = slice[j]
        const embedding = vectors[j]
        await prisma.investor.update({
          where: { id: investor.id },
          data: { embedding: JSON.stringify(embedding) },
        })
        console.log(`✅ ${investor.firmName} (${embedding.length} dims)`)
        generated++
      }
    } catch (error: any) {
      console.error(`❌ Batch failed (${slice.map((s) => s.investor.firmName).join(', ')}):`, error.message)
      errors += slice.length
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

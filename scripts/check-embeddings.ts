/**
 * Check VC embeddings vs Smart Match (Voyage voyage-3, 1024-dim).
 * Run: npx tsx scripts/check-embeddings.ts
 */

import { db } from '../lib/db'
import { EMBEDDING_DIMENSIONS } from '../lib/embeddings'

async function main() {
  console.log('🔍 Checking VC embeddings...\n')

  const total = await db.investor.count({
    where: { verified: true, isPublic: true },
  })

  const withEmbedding = await db.investor.count({
    where: {
      verified: true,
      isPublic: true,
      embedding: { not: null },
      NOT: { embedding: '' },
    },
  })

  const missing = total - withEmbedding

  const investors = await db.investor.findMany({
    where: { verified: true, isPublic: true },
    select: { id: true, firmName: true, embedding: true },
  })

  let dimTarget = 0
  let dim3072 = 0
  let dim768 = 0
  let dimOther = 0
  let invalid = 0
  const wrongDimExamples: { firmName: string; dim: number }[] = []

  for (const inv of investors) {
    if (!inv.embedding || inv.embedding === '') {
      continue
    }
    try {
      const arr = JSON.parse(inv.embedding)
      if (!Array.isArray(arr)) {
        invalid++
        continue
      }
      const len = arr.length
      if (len === EMBEDDING_DIMENSIONS) {
        dimTarget++
      } else if (len === 3072) {
        dim3072++
        if (wrongDimExamples.length < 5) {
          wrongDimExamples.push({ firmName: inv.firmName, dim: len })
        }
      } else if (len === 768) {
        dim768++
        if (wrongDimExamples.length < 5) {
          wrongDimExamples.push({ firmName: inv.firmName, dim: len })
        }
      } else {
        dimOther++
        if (wrongDimExamples.length < 5) {
          wrongDimExamples.push({ firmName: inv.firmName, dim: len })
        }
      }
    } catch {
      invalid++
    }
  }

  console.log(`Smart Match expects: ${EMBEDDING_DIMENSIONS} dimensions (Voyage voyage-3)\n`)

  console.log('📊 Summary')
  console.log('─'.repeat(50))
  console.log(`Total verified+public investors: ${total}`)
  console.log(`With non-empty embedding:        ${withEmbedding}`)
  console.log(`Missing embedding:              ${missing}`)
  console.log('')
  console.log('Dimension breakdown (of those with embedding):')
  console.log(`  1024 (ready for Smart Match):  ${dimTarget}`)
  console.log(`  3072 (legacy — re-embed):      ${dim3072}`)
  console.log(`  768 (old Gemini):             ${dim768}`)
  console.log(`  Other:                       ${dimOther}`)
  console.log(`  Invalid JSON:                ${invalid}`)
  console.log('')

  if (wrongDimExamples.length > 0) {
    console.log('Examples with wrong dimension:')
    wrongDimExamples.forEach((e) => console.log(`  - ${e.firmName}: ${e.dim} dims`))
    console.log('')
  }

  const allCorrect =
    missing === 0 &&
    dimTarget === total &&
    dim3072 === 0 &&
    dim768 === 0 &&
    dimOther === 0 &&
    invalid === 0
  if (allCorrect) {
    console.log('✅ All embeddings present and 1024-dimensional (Voyage).')
  } else {
    console.log('⚠️  Issues found. Run npm run generate-vc-embeddings to fill or replace wrong-dim rows.')
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

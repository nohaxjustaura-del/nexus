/**
 * Check that all embeddings exist and are 1024-dimensional (Voyage AI).
 * Run: npx tsx scripts/check-embeddings.ts
 */

import { db } from '../lib/db'

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

  let dim1024 = 0
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
      if (arr.length === 1024) {
        dim1024++
      } else if (arr.length === 768) {
        dim768++
        if (wrongDimExamples.length < 5) {
          wrongDimExamples.push({ firmName: inv.firmName, dim: arr.length })
        }
      } else {
        dimOther++
        if (wrongDimExamples.length < 5) {
          wrongDimExamples.push({ firmName: inv.firmName, dim: arr.length })
        }
      }
    } catch {
      invalid++
    }
  }

  console.log('📊 Summary')
  console.log('─'.repeat(50))
  console.log(`Total verified+public investors: ${total}`)
  console.log(`With non-empty embedding:        ${withEmbedding}`)
  console.log(`Missing embedding:              ${missing}`)
  console.log('')
  console.log('Dimension breakdown (of those with embedding):')
  console.log(`  1024 (Voyage AI ✓):           ${dim1024}`)
  console.log(`  768 (old Gemini):             ${dim768}`)
  console.log(`  Other:                       ${dimOther}`)
  console.log(`  Invalid JSON:                ${invalid}`)
  console.log('')

  if (wrongDimExamples.length > 0) {
    console.log('Examples with wrong dimension:')
    wrongDimExamples.forEach((e) => console.log(`  - ${e.firmName}: ${e.dim} dims`))
    console.log('')
  }

  const allCorrect = missing === 0 && dim768 === 0 && dimOther === 0 && invalid === 0
  if (allCorrect) {
    console.log('✅ All embeddings present and 1024-dimensional.')
  } else {
    console.log('⚠️  Issues found. Run npm run generate-vc-embeddings to fix missing/wrong-dim embeddings.')
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

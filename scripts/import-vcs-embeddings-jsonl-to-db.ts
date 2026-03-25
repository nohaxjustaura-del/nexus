/**
 * Import every VC from vcs_embeddings.jsonl into the database (Supabase/Postgres via Prisma).
 * Merges rich fields from faiss-data/vcs_embedding_inputs_trimmed.json when firm_name matches.
 *
 * Usage:
 *   npx tsx scripts/import-vcs-embeddings-jsonl-to-db.ts
 *
 * Optional env:
 *   VCS_EMBEDDINGS_JSONL — path to JSONL (default: ./vcs_embeddings.jsonl)
 *   VCS_METADATA_JSONL   — path to metadata JSONL (default: ./faiss-data/vcs_embedding_inputs_trimmed.json)
 */

import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { readFileSync } from 'fs'
import { join } from 'path'
import { db as prisma } from '../lib/db'

interface FaissVC {
  id: string
  firm_name: string
  embedding_text: string
  metadata: {
    stages: string[]
    sectors: string[]
    geography: string[]
    check_size: { min_usd: number; max_usd: number }
    investor_type: string
    thesis: string
  }
}

interface JsonlRow {
  firm_name: string
  embedding: number[]
}

function extractFromEmbeddingText(text: string): {
  valueAdd: string[]
  portfolio: string[]
  decisionSpeed: string | null
  leadFollow: string
} {
  const valueAdd: string[] = []
  const portfolio: string[] = []
  let decisionSpeed: string | null = null
  let leadFollow = 'either'

  const valueAddMatch = text.match(/Specializations:\s*([^\n]+)/i)
  if (valueAddMatch?.[1]?.trim()) {
    valueAdd.push(...valueAddMatch[1].split(',').map((s) => s.trim()).filter(Boolean))
  }

  const offersMatch = text.match(/offers\s+([^.]+)/i)
  if (offersMatch) {
    const items = offersMatch[1].split(/,\s*(?:and\s+)?/).map((s) => s.trim()).filter(Boolean)
    valueAdd.push(...items)
  }

  const portfolioMatch = text.match(/PORTFOLIO COMPANIES\n(.+)/i)
  if (portfolioMatch?.[1]?.trim() && portfolioMatch[1].trim() !== 'None listed') {
    portfolio.push(portfolioMatch[1].trim())
  }

  const speedMatch = text.match(/decision speed[:\s]+([^.]+)/i)
  if (speedMatch) decisionSpeed = speedMatch[1].trim()

  const t = text.toLowerCase()
  if (t.includes('typically leads')) leadFollow = 'lead'
  else if (t.includes('typically follows')) leadFollow = 'follow'
  else if (t.includes('lead or follow: either')) leadFollow = 'either'

  return { valueAdd: [...new Set(valueAdd)], portfolio, decisionSpeed, leadFollow }
}

function generateEmail(firmName: string, index: number): string {
  const slug = firmName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30)
  return `contact-${slug}-${index}@investor.foundermatch.vc`
}

function mapFundType(type: string): string {
  const typeMap: Record<string, string> = {
    accelerator: 'accelerator',
    'micro-vc': 'micro-VC',
    'micro-VC': 'micro-VC',
    angel: 'angel',
    vc: 'Venture Capital',
    institutional: 'institutional',
    cvc: 'CVC',
    corporate: 'CVC',
    'family-office': 'family-office',
    government: 'government',
  }
  return typeMap[type.toLowerCase()] || 'Venture Capital'
}

function loadMetadataByFirmName(path: string): Map<string, FaissVC> {
  const raw = readFileSync(path, 'utf-8')
  const rows: FaissVC[] = raw
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as FaissVC)
  const map = new Map<string, FaissVC>()
  for (const row of rows) {
    const key = row.firm_name.toLowerCase().trim()
    if (map.has(key)) {
      console.warn(`⚠️  Duplicate metadata firm_name (last wins): ${row.firm_name}`)
    }
    map.set(key, row)
  }
  return map
}

function buildCreateData(
  meta: FaissVC | undefined,
  firmName: string,
  embeddingJson: string,
  email: string
) {
  if (meta) {
    const extracted = extractFromEmbeddingText(meta.embedding_text || '')
    const checkMin = Math.round(meta.metadata.check_size.min_usd / 1000)
    const checkMax = Math.round(meta.metadata.check_size.max_usd / 1000)
    return {
      id: meta.id,
      email,
      name: meta.firm_name,
      firmName: meta.firm_name,
      verified: true,
      stages: JSON.stringify(meta.metadata.stages || []),
      sectors: JSON.stringify(meta.metadata.sectors || []),
      geoFocus: JSON.stringify(meta.metadata.geography || []),
      geography: JSON.stringify(meta.metadata.geography || []),
      checkMin,
      checkMax,
      checkSizeMin: meta.metadata.check_size.min_usd,
      checkSizeMax: meta.metadata.check_size.max_usd,
      fundType: mapFundType(meta.metadata.investor_type),
      thesis: meta.metadata.thesis || null,
      leadFollow: extracted.leadFollow,
      valueAddTags: JSON.stringify(extracted.valueAdd),
      ethicsTags: JSON.stringify([]),
      decisionSpeed: extracted.decisionSpeed,
      portfolio: extracted.portfolio.length > 0 ? JSON.stringify(extracted.portfolio) : null,
      bio: `${meta.firm_name} - ${mapFundType(meta.metadata.investor_type)}`,
      isPublic: true,
      discoverable: true,
      embedding: embeddingJson,
    }
  }

  return {
    email,
    name: firmName,
    firmName,
    verified: true,
    stages: JSON.stringify(['Seed']),
    sectors: JSON.stringify(['Technology']),
    geoFocus: JSON.stringify(['Global']),
    geography: JSON.stringify(['Global']),
    checkMin: 100,
    checkMax: 500,
    checkSizeMin: 100_000,
    checkSizeMax: 500_000,
    fundType: 'Venture Capital',
    thesis: null as string | null,
    leadFollow: 'either',
    valueAddTags: JSON.stringify([]),
    ethicsTags: JSON.stringify([]),
    decisionSpeed: null as string | null,
    portfolio: null as string | null,
    bio: `${firmName} - Venture Capital`,
    isPublic: true,
    discoverable: true,
    embedding: embeddingJson,
  }
}

async function main() {
  const jsonlPath =
    process.env.VCS_EMBEDDINGS_JSONL || join(process.cwd(), 'vcs_embeddings.jsonl')
  const metaPath =
    process.env.VCS_METADATA_JSONL ||
    join(process.cwd(), 'faiss-data', 'vcs_embedding_inputs_trimmed.json')

  console.log('🚀 Importing VCs from embeddings JSONL → database\n')
  console.log(`   Embeddings file: ${jsonlPath}`)
  console.log(`   Metadata file:   ${metaPath}\n`)

  const metadataByFirm = loadMetadataByFirmName(metaPath)
  console.log(`📂 Loaded ${metadataByFirm.size} metadata rows\n`)

  const existing = await prisma.investor.findMany({
    select: { id: true, firmName: true, email: true },
  })
  const existingEmails = new Set(existing.map((i) => i.email.toLowerCase()))

  let lineNo = 0
  let created = 0
  let updated = 0
  let skippedBad = 0
  let errors = 0

  const rl = createInterface({
    input: createReadStream(jsonlPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    lineNo++
    const trimmed = line.trim()
    if (!trimmed) continue

    let row: JsonlRow
    try {
      row = JSON.parse(trimmed) as JsonlRow
    } catch {
      console.error(`❌ Line ${lineNo}: invalid JSON`)
      errors++
      continue
    }

    const firmName = row.firm_name?.trim()
    if (!firmName) {
      skippedBad++
      continue
    }

    const emb = row.embedding
    if (!Array.isArray(emb) || emb.length < 256) {
      console.error(`❌ Line ${lineNo} (${firmName}): missing or invalid embedding vector`)
      skippedBad++
      continue
    }

    const embeddingJson = JSON.stringify(emb)
    const meta = metadataByFirm.get(firmName.toLowerCase())

    try {
      const found = await prisma.investor.findFirst({
        where: { firmName: { equals: firmName, mode: 'insensitive' } },
      })

      if (found) {
        await prisma.investor.update({
          where: { id: found.id },
          data: { embedding: embeddingJson },
        })
        updated++
        if (updated % 100 === 0) console.log(`   … updated ${updated} (embedding sync)`)
        continue
      }

      let email = generateEmail(firmName, lineNo)
      while (existingEmails.has(email.toLowerCase())) {
        email = generateEmail(firmName, lineNo + Math.floor(Math.random() * 1e6))
      }
      existingEmails.add(email.toLowerCase())

      const data = buildCreateData(meta, firmName, embeddingJson, email)

      await prisma.investor.create({ data })
      created++
      if (created % 50 === 0) console.log(`   ✅ Created ${created} new investors…`)
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.error(`❌ Unique constraint (${firmName}):`, e.meta?.target)
      } else {
        console.error(`❌ ${firmName}:`, e.message)
      }
      errors++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 SUMMARY')
  console.log('='.repeat(50))
  console.log(`✅ Created: ${created}`)
  console.log(`🔄 Updated embeddings (existing firm): ${updated}`)
  console.log(`⏭️  Skipped (bad row): ${skippedBad}`)
  console.log(`❌ Errors: ${errors}`)
  console.log('='.repeat(50))

  const total = await prisma.investor.count()
  console.log(`\n📈 Total investors in database: ${total}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

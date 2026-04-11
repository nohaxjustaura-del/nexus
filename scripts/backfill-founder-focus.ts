/**
 * One-time backfill script — populate Investor.founderFocus from existing data.
 *
 * Scans firmName, thesis, bio, and ethicsTags for demographic signals and
 * writes a JSON array to the founderFocus column.
 *
 * Usage:
 *   npx tsx scripts/backfill-founder-focus.ts
 *   npx tsx scripts/backfill-founder-focus.ts --dry-run
 */

import '../lib/load-env'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

type FocusTag = 'women' | 'immigrant' | 'veteran' | 'lgbtq' | 'underrepresented'

// Known niche-exclusive funds mapped to their focus tags
const KNOWN_FUNDS: Record<string, FocusTag[]> = {
  'female founders fund': ['women'],
  'bbg ventures': ['women'],
  'xfactor ventures': ['women'],
  'the artemis fund': ['women'],
  'sogal ventures': ['women', 'underrepresented'],
  'golden seeds': ['women'],
  'all raise': ['women'],
  'cartier women': ['women'],
  'tory burch': ['women'],
  'fearless fund': ['underrepresented', 'women'],
  'chingona ventures': ['underrepresented', 'women'],
  'unshackled ventures': ['immigrant'],
  'oneway ventures': ['immigrant'],
  'global founders capital': ['immigrant'],
  'hivers and strivers': ['veteran'],
  'bunker labs': ['veteran'],
  'vetcap': ['veteran'],
  'gaingels': ['lgbtq'],
  'pride fund': ['lgbtq'],
  'backstage capital': ['underrepresented', 'women', 'lgbtq'],
  'harlem capital': ['underrepresented'],
  'kapor capital': ['underrepresented'],
  'precursor ventures': ['underrepresented'],
  'base10 partners': ['underrepresented'],
  'visible hands': ['underrepresented'],
  'mac venture capital': ['underrepresented'],
  'black ambition': ['underrepresented'],
  'cross culture ventures': ['underrepresented'],
}

// Keyword patterns for heuristic detection
const PATTERNS: { pattern: RegExp; tag: FocusTag }[] = [
  { pattern: /\bwomen[- ]led\b/i, tag: 'women' },
  { pattern: /\bfemale founder/i, tag: 'women' },
  { pattern: /\bwomen founder/i, tag: 'women' },
  { pattern: /\binvest(ing|s)?\s+(exclusively\s+)?in\s+women/i, tag: 'women' },
  { pattern: /\bimmigrant founder/i, tag: 'immigrant' },
  { pattern: /\binternational founder/i, tag: 'immigrant' },
  { pattern: /\bvisa support/i, tag: 'immigrant' },
  { pattern: /\bveteran founder/i, tag: 'veteran' },
  { pattern: /\bmilitary founder/i, tag: 'veteran' },
  { pattern: /\blgbtq/i, tag: 'lgbtq' },
  { pattern: /\bunderrepresented founder/i, tag: 'underrepresented' },
  { pattern: /\bdiverse founder/i, tag: 'underrepresented' },
  { pattern: /\bminority founder/i, tag: 'underrepresented' },
  { pattern: /\bbipoc founder/i, tag: 'underrepresented' },
  { pattern: /\bblack founder/i, tag: 'underrepresented' },
  { pattern: /\blatinx? founder/i, tag: 'underrepresented' },
]

function detectFocus(investor: {
  firmName: string
  name: string
  thesis: string | null
  bio: string
  ethicsTags: string
}): FocusTag[] {
  const tags = new Set<FocusTag>()

  // Check known funds first
  const firmLow = investor.firmName.toLowerCase()
  const nameLow = investor.name.toLowerCase()
  for (const [key, focusTags] of Object.entries(KNOWN_FUNDS)) {
    if (firmLow.includes(key) || nameLow.includes(key)) {
      for (const t of focusTags) tags.add(t)
    }
  }

  // Check text fields against patterns
  const searchable = [
    investor.thesis ?? '',
    investor.bio,
    investor.ethicsTags,
  ].join(' ')

  for (const { pattern, tag } of PATTERNS) {
    if (pattern.test(searchable)) tags.add(tag)
  }

  return [...tags].sort()
}

async function main() {
  const investors = await db.investor.findMany({
    select: {
      id: true,
      firmName: true,
      name: true,
      thesis: true,
      bio: true,
      ethicsTags: true,
      founderFocus: true,
    },
  })

  console.log(`Found ${investors.length} investors to scan`)

  let updated = 0
  let skipped = 0

  for (const inv of investors) {
    const existing = (() => {
      try {
        const parsed = JSON.parse(inv.founderFocus)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    })()

    // Skip if already populated
    if (existing.length > 0) {
      skipped++
      continue
    }

    const tags = detectFocus(inv)
    if (tags.length === 0) continue

    if (DRY_RUN) {
      console.log(`[DRY RUN] ${inv.firmName} → ${JSON.stringify(tags)}`)
    } else {
      await db.investor.update({
        where: { id: inv.id },
        data: { founderFocus: JSON.stringify(tags) },
      })
    }
    updated++
  }

  console.log(`\nDone. Updated: ${updated}, Skipped (already set): ${skipped}, Unchanged: ${investors.length - updated - skipped}`)
  if (DRY_RUN) console.log('(dry run — no writes were made)')

  await db.$disconnect()
}

main().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})

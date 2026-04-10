#!/usr/bin/env tsx
/**
 * Focused worker: Exa (apply/contact/LinkedIn passes) + LLM → update Investor.applicationUrl,
 * websiteUrl, linkedinUrl with validation (rejects press wires, obvious junk).
 *
 * Usage:
 *   npx tsx scripts/vc-apply-contact-worker.ts --limit 20
 *   npx tsx scripts/vc-apply-contact-worker.ts --firms "Sequoia Capital,Y Combinator"
 *   npx tsx scripts/vc-apply-contact-worker.ts --overwrite --limit 10
 *
 * Env: EXA_API_KEYS (or EXA_API_KEY), OPENROUTER_API_KEY or Ollama VC vars (same as VC research pipeline).
 * Optional: VC_APPLY_CONTACT_EXA_NUM_RESULTS, VC_APPLY_CONTACT_CONTEXT_CHARS
 */

import { db } from '../lib/db'
import { ExaResearchQuotaBlockedError } from '../lib/vc-research-retrieval'
import {
  runApplyContactBatch,
  researchApplyContactAndUpdate,
} from '../lib/vc-apply-contact-research'

function parseArgs(argv: string[]) {
  const out = {
    limit: 15,
    overwrite: false,
    firms: [] as string[],
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--limit' && argv[i + 1]) {
      out.limit = Math.max(1, parseInt(argv[++i], 10) || out.limit)
    } else if (a === '--overwrite') {
      out.overwrite = true
    } else if (a === '--firms' && argv[i + 1]) {
      out.firms = argv[++i]
        .split(/[,|]/g)
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return out
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.firms.length === 1) {
    try {
      const r = await researchApplyContactAndUpdate(args.firms[0], { overwrite: args.overwrite })
      console.log(JSON.stringify(r, null, 2))
    } catch (e) {
      if (e instanceof ExaResearchQuotaBlockedError) {
        console.error(`🛑 Exa quota/cooldown (${e.reason}) — no updates`)
        process.exitCode = 1
        return
      }
      throw e
    }
    return
  }

  const batch = await runApplyContactBatch({
    firmNames: args.firms.length ? args.firms : undefined,
    limit: args.limit,
    overwrite: args.overwrite,
    delayBetweenMs: 2500,
    maxConcurrent: 2,
  })

  console.log('\n📋 Apply / contact URL worker done:')
  console.log(`   Processed: ${batch.processed}`)
  console.log(`   Rows with URL updates: ${batch.rowsUpdated}`)
  console.log(`   Errors: ${batch.errors}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

/**
 * Backfill FounderAnalysisSummary from existing analyses.
 * Run: npx tsx scripts/backfill-analysis-summaries.ts
 */
import { db } from '../lib/db'

function parseJSON(val: unknown): any {
  if (!val) return null
  if (typeof val === 'object') return val
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return null }
  }
  return null
}

function toSummaryText(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'string') return val.slice(0, 2000)
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>
    const parts: string[] = []
    if (Array.isArray(obj.strengths)) parts.push(...obj.strengths.map(String))
    if (Array.isArray(obj.gaps)) parts.push(...obj.gaps.map((g: unknown) => `Gap: ${g}`))
    return parts.length > 0 ? parts.join('; ').slice(0, 2000) : null
  }
  return null
}

async function main() {
  console.log('Backfilling FounderAnalysisSummary from existing analyses...\n')

  const founders = await db.founder.findMany({
    select: { id: true, name: true, email: true, stage: true, fundingNeed: true, startupName: true },
  })
  console.log(`Found ${founders.length} founders total.\n`)

  let updated = 0
  let skipped = 0

  for (const founder of founders) {
    // Check if already has a summary
    const existing = await (db as any).founderAnalysisSummary.findFirst({
      where: { founderId: founder.id },
    })
    if (existing) {
      skipped++
      continue
    }

    // Find the best analysis across all types
    let bestAnalysis: any = null
    let bestScore = 0
    let bestType = ''
    let bestId = ''

    // Check unified/video pitches
    const videoPitches = await (db as any).videoPitch.findMany({
      where: { founderId: founder.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    for (const vp of videoPitches) {
      const result = parseJSON(vp.analysisResult)
      if (!result || result.reviewPending) continue
      const score = result.overallScore || result.finalScore || 0
      if (score > bestScore) {
        bestScore = score
        bestAnalysis = result
        bestType = result.pitchType === 'UNIFIED' ? 'UNIFIED' : 'VIDEO'
        bestId = vp.id
      }
    }

    // Check pitch idea analyses
    const pitchIdeas = await (db as any).pitchIdeaAnalysis.findMany({
      where: { founderId: founder.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    for (const pi of pitchIdeas) {
      const result = parseJSON(pi.analysisResult)
      if (!result) continue
      const score = result.overallScore || result.finalScore || 0
      if (score > bestScore) {
        bestScore = score
        bestAnalysis = result
        bestType = 'IDEA'
        bestId = pi.id
      }
    }

    // Check pitch deck analyses
    const pitchDecks = await db.pitchDeckAnalysis.findMany({
      where: { founderId: founder.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    for (const pd of pitchDecks) {
      const result = parseJSON(pd.analysisResult)
      if (!result) continue
      const score = result.overallScore || result.finalScore || (pd as any).overallScore || 0
      if (score > bestScore) {
        bestScore = score
        bestAnalysis = result
        bestType = 'DECK'
        bestId = pd.id
      }
    }

    if (!bestAnalysis || bestScore === 0) {
      skipped++
      continue
    }

    const cs = bestAnalysis.categoryScores
    const rc = bestAnalysis.rubricAnalysis?.categories
    const marketText = toSummaryText(bestAnalysis.marketAnalysis)
    const teamText = toSummaryText(bestAnalysis.teamAnalysis)

    const strengths = bestAnalysis.strengths || []
    const executiveParts: string[] = []
    if (strengths.length) executiveParts.push(strengths[0])
    if (marketText) {
      const first = marketText.split(/[.!?]\s/)[0]
      if (first && first.length > 10) executiveParts.push(first + '.')
    }
    if (founder.stage && founder.fundingNeed) {
      executiveParts.push(`Seeking $${founder.fundingNeed}K at ${founder.stage} stage.`)
    }
    const executiveSummary = executiveParts.join(' ').slice(0, 500) || 'Analysis available.'

    // Determine tier from scoring
    const tier = bestAnalysis.tier ||
      (bestScore >= 80 ? 'EXCEPTIONAL' : bestScore >= 65 ? 'STRONG' : bestScore >= 45 ? 'DEVELOPING' : bestScore >= 25 ? 'EARLY' : 'PASS')

    try {
      await (db as any).founderAnalysisSummary.create({
        data: {
          founderId: founder.id,
          summaryStartupName: founder.startupName?.trim() || null,
          overallScore: bestScore,
          tier,
          conviction: bestAnalysis.conviction || null,
          marketScore: cs?.market ?? null,
          teamScore: cs?.team ?? null,
          tractionScore: cs?.traction ?? null,
          productScore: cs?.product ?? null,
          businessModelScore: cs?.businessModel ?? null,
          visionScore: cs?.vision ?? null,
          crossSectionScore: cs?.crossSection ?? null,
          rubricMarketHeat: rc?.market?.score ?? null,
          rubricMoat: rc?.moat?.score ?? null,
          rubricFounderFit: rc?.founderFit?.score ?? null,
          rubricMomentum: rc?.momentum?.score ?? null,
          strengths: Array.isArray(strengths) ? JSON.stringify(strengths.slice(0, 5)) : null,
          weaknesses: Array.isArray(bestAnalysis.weaknesses) ? JSON.stringify(bestAnalysis.weaknesses.slice(0, 3)) : null,
          marketAnalysis: marketText,
          teamAnalysis: teamText,
          productFit: bestAnalysis.productFit ? JSON.stringify(bestAnalysis.productFit) : null,
          sectorFit: bestAnalysis.sectorFit ? JSON.stringify(bestAnalysis.sectorFit) : null,
          tractionMetrics: bestAnalysis.tractionMetrics ? JSON.stringify(bestAnalysis.tractionMetrics) : null,
          executiveSummary,
          redFlags: bestAnalysis.redFlags ? JSON.stringify(bestAnalysis.redFlags) : null,
          bullCase: bestAnalysis.bullCase?.slice(0, 1000) ?? null,
          bearCase: bestAnalysis.bearCase?.slice(0, 1000) ?? null,
          analysisType: bestType,
          sourceAnalysisId: bestId,
          scoreBreakdown: bestAnalysis.scoreBreakdown ? JSON.stringify(bestAnalysis.scoreBreakdown) : null,
        },
      })
      updated++
      console.log(`  + ${founder.name || founder.email} — score ${bestScore} (${bestType})`)
    } catch (err: any) {
      console.error(`  x ${founder.name || founder.email} — ERROR: ${err.message}`)
    }
  }

  console.log(`\nDone. Backfilled: ${updated}, Skipped: ${skipped} (already had summary or no analysis)`)
  process.exit(0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

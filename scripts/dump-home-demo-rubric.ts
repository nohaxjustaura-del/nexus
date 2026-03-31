/**
 * Usage: npx tsx scripts/dump-home-demo-rubric.ts [email]
 * Prints resolved UniversalAnalysisResult JSON for the founder's latest stored analysis.
 */
import { db } from '../lib/db'
import { resolveRubricForDashboard } from '../lib/analysis/is-safe-rubric-for-dashboard'

const email = (process.argv[2] || '').trim() || 'nohaxjustaura@gmail.com'

async function main() {
  const founder = await db.founder.findUnique({
    where: { email },
    select: { id: true, email: true },
  })
  if (!founder) {
    console.error('No Founder row for', email)
    process.exit(1)
  }

  const [v, d, i] = await Promise.all([
    db.videoPitch.findFirst({
      where: { founderId: founder.id, analysisResult: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { analysisResult: true, createdAt: true, fileName: true },
    }),
    db.pitchDeckAnalysis.findFirst({
      where: { founderId: founder.id, analysisResult: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { analysisResult: true, createdAt: true, fileName: true },
    }),
    db.pitchIdeaAnalysis.findFirst({
      where: { founderId: founder.id, analysisResult: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { analysisResult: true, createdAt: true },
    }),
  ])

  type Row = { analysisResult: string; createdAt: Date; source: string; label: string }
  const rows: Row[] = []
  if (v?.analysisResult != null) {
    rows.push({ analysisResult: v.analysisResult, createdAt: v.createdAt, source: 'video', label: v.fileName || 'video' })
  }
  if (d?.analysisResult != null) {
    rows.push({ analysisResult: d.analysisResult, createdAt: d.createdAt, source: 'deck', label: d.fileName || 'deck' })
  }
  if (i?.analysisResult != null) {
    rows.push({ analysisResult: i.analysisResult, createdAt: i.createdAt, source: 'idea', label: 'pitch-idea' })
  }

  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const latest = rows[0]
  if (!latest) {
    console.error('No analysisResult on video/deck/idea for', email)
    process.exit(1)
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(latest.analysisResult) as Record<string, unknown>
  } catch {
    console.error('Invalid JSON in analysisResult')
    process.exit(1)
  }

  const rubric = resolveRubricForDashboard(parsed)
  if (!rubric) {
    console.error('Could not resolve rubric from stored result. Keys:', Object.keys(parsed))
    process.exit(1)
  }

  console.log(JSON.stringify({ picked: latest.source, at: latest.createdAt.toISOString(), rubric }, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())

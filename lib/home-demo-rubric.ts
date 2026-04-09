import { unstable_cache } from 'next/cache'
import type { UniversalAnalysisResult } from '@/lib/universal-analysis-engine'
import { resolveRubricForDashboard } from '@/lib/analysis/is-safe-rubric-for-dashboard'

/** Tag for `revalidateTag` when demo analysis data changes. */
export const HOME_DEMO_RUBRIC_CACHE_TAG = 'home-demo-rubric'

/**
 * Snapshot from the latest advanced scoring run (video pitch, 2026-03-30) for
 * nohaxjustaura@gmail.com — used when DB/env is unavailable.
 */
export const HOME_DEMO_RUBRIC_FALLBACK: UniversalAnalysisResult = {
  categories: {
    market: {
      score: 65,
      bullets: [
        'Top AI startups raised $150B in 2025, indicating a highly competitive market.',
        'Competitors like OpusClip and Runway have already secured significant funding.',
        'Incumbents like Google DeepMind employ 4,802 people, showcasing their dominance.',
        'The $66.8B TAM suggests ample opportunity, but saturation is a concern.',
      ],
    },
    moat: {
      score: 50,
      bullets: [
        'GPT-5/6 advancements could render many AI tools obsolete.',
        'No mention of proprietary data sets or unique algorithms.',
        'Regulatory changes in Russia and the UK could impact global AI strategies.',
        'Network effects are unclear at this early stage.',
      ],
    },
    founderFit: {
      score: 80,
      bullets: [
        'CEO has 15,000 followers and 5 years of video editing experience.',
        "CTO's technical depth is implied but not detailed.",
        'Founders have practical experience in video marketing for startups.',
        'Early traction with 120 signups in 3 days shows potential.',
      ],
    },
    momentum: {
      score: 70,
      bullets: [
        '120 signups in 3 days at a 30% conversion rate is promising.',
        'No revenue or growth rate data available yet.',
        'Graveyard data shows 93% of startups fail, highlighting the need for rapid scaling.',
        'Early engagement suggests potential for viral growth.',
      ],
    },
    execution: null,
  },
  globalVerdict:
    'Calibrated outcome: 73/100 (STRONG, HIGH conviction). Vira shows promise with strong founder-market fit and early traction, but faces significant challenges in a crowded market and lacks a clear moat. The startup needs to focus on building proprietary technology and scaling quickly to compete effectively. While the idea is compelling, further validation is needed before committing to an investment.',
}

async function loadHomeDemoRubricFromDb(): Promise<UniversalAnalysisResult> {
  const email = process.env.HOME_DEMO_RUBRIC_EMAIL?.trim()
  if (!email) return HOME_DEMO_RUBRIC_FALLBACK

  try {
    const { db } = await import('@/lib/db')
    const founder = await db.founder.findUnique({
      where: { email },
      select: { id: true },
    })
    if (!founder) return HOME_DEMO_RUBRIC_FALLBACK

    const [v, d, i] = await Promise.all([
      db.videoPitch.findFirst({
        where: { founderId: founder.id, analysisResult: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { analysisResult: true, createdAt: true },
      }),
      db.pitchDeckAnalysis.findFirst({
        where: { founderId: founder.id, analysisResult: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { analysisResult: true, createdAt: true },
      }),
      db.pitchIdeaAnalysis.findFirst({
        where: { founderId: founder.id, analysisResult: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { analysisResult: true, createdAt: true },
      }),
    ])

    type Row = { analysisResult: string; createdAt: Date }
    const rows: Row[] = []
    if (v?.analysisResult != null) rows.push({ analysisResult: v.analysisResult, createdAt: v.createdAt })
    if (d?.analysisResult != null) rows.push({ analysisResult: d.analysisResult, createdAt: d.createdAt })
    if (i?.analysisResult != null) rows.push({ analysisResult: i.analysisResult, createdAt: i.createdAt })
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const latest = rows[0]
    if (!latest) return HOME_DEMO_RUBRIC_FALLBACK

    const parsed = JSON.parse(latest.analysisResult) as Record<string, unknown>
    const rubric = resolveRubricForDashboard(parsed)
    return rubric ?? HOME_DEMO_RUBRIC_FALLBACK
  } catch {
    return HOME_DEMO_RUBRIC_FALLBACK
  }
}

const homeDemoRubricEmailKey = process.env.HOME_DEMO_RUBRIC_EMAIL?.trim() ?? ''

/**
 * When `HOME_DEMO_RUBRIC_EMAIL` is set, loads the newest stored analysis (video, deck, or idea)
 * for that founder email and resolves the rubric for the marketing preview.
 * Cached so the home page does not hit the database on every request.
 */
export const getHomeDemoRubric = unstable_cache(loadHomeDemoRubricFromDb, ['home-demo-rubric', homeDemoRubricEmailKey], {
  revalidate: 300,
  tags: [HOME_DEMO_RUBRIC_CACHE_TAG],
})

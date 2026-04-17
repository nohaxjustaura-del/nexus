import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'

/**
 * Cached public analyses count for homepage marketing stats.
 * Counts founder-facing analyses generated across supported analysis types.
 */
export const getPublicAnalysesCount = unstable_cache(
  async () => {
    const [resumeAnalyses, pitchDeckAnalyses, pitchIdeaAnalyses] = await Promise.all([
      db.resumeAnalysis.count(),
      db.pitchDeckAnalysis.count(),
      db.pitchIdeaAnalysis.count(),
    ])
    return resumeAnalyses + pitchDeckAnalyses + pitchIdeaAnalyses
  },
  ['public-analyses-count'],
  { revalidate: 120 }
)

export async function getPublicAnalysesCountLive(): Promise<number> {
  const [resumeAnalyses, pitchDeckAnalyses, pitchIdeaAnalyses] = await Promise.all([
    db.resumeAnalysis.count(),
    db.pitchDeckAnalysis.count(),
    db.pitchIdeaAnalysis.count(),
  ])
  return resumeAnalyses + pitchDeckAnalyses + pitchIdeaAnalyses
}

export async function getPublicAnalysesCountForCurrentEnv(): Promise<number> {
  if (process.env.NODE_ENV === 'development') {
    return getPublicAnalysesCountLive()
  }
  return getPublicAnalysesCount()
}

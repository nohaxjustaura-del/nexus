import { db } from '@/lib/db'
import { USER_LIMITS } from '@/lib/constants'

/** Inclusive start, exclusive end — UTC week starting Monday 00:00. */
export function getUtcWeekRange(now: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const day = d.getUTCDay() // 0 Sun .. 6 Sat
  const daysFromMonday = (day + 6) % 7
  d.setUTCDate(d.getUTCDate() - daysFromMonday)
  d.setUTCHours(0, 0, 0, 0)
  const start = d
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 7)
  return { start, end }
}

export async function countPitchIdeaAnalysesInWeek(
  founderId: string,
  start: Date,
  end: Date
): Promise<number> {
  return db.pitchIdeaAnalysis.count({
    where: {
      founderId,
      createdAt: { gte: start, lt: end },
    },
  })
}

export type PitchIdeaWeeklyQuotaInfo = {
  used: number
  limit: number
  remaining: number
  resetsAt: string
}

export async function getPitchIdeaWeeklyQuotaInfo(
  founderId: string | null,
  now: Date = new Date()
): Promise<PitchIdeaWeeklyQuotaInfo> {
  const limit = USER_LIMITS.FREE_PITCH_IDEA_ANALYSES_PER_WEEK
  const { start, end } = getUtcWeekRange(now)
  if (!founderId) {
    return {
      used: 0,
      limit,
      remaining: limit,
      resetsAt: end.toISOString(),
    }
  }
  const used = await countPitchIdeaAnalysesInWeek(founderId, start, end)
  const remaining = Math.max(0, limit - used)
  return {
    used,
    limit,
    remaining,
    resetsAt: end.toISOString(),
  }
}

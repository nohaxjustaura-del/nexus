import { db } from '@/lib/db'

export type FounderVerificationListRow = {
  email: string
  url: string | null
  status: string
  submittedAt: Date
  verifiedAt: Date | null
  reviewerEmail: string | null
}

export type EnrichedFounderVerification = FounderVerificationListRow & {
  founderName: string | null
}

/** Safe to pass from Server Components to client components */
export type FounderVerificationReviewItem = {
  email: string
  url: string | null
  status: string
  submittedAt: string
  verifiedAt: string | null
  reviewerEmail: string | null
  founderName: string | null
}

export function serializeFounderVerificationRows(
  rows: EnrichedFounderVerification[]
): FounderVerificationReviewItem[] {
  return rows.map((r) => ({
    email: r.email,
    url: r.url,
    status: r.status,
    submittedAt: r.submittedAt.toISOString(),
    verifiedAt: r.verifiedAt?.toISOString() ?? null,
    reviewerEmail: r.reviewerEmail,
    founderName: r.founderName,
  }))
}

export async function enrichFounderVerifications(
  rows: FounderVerificationListRow[]
): Promise<EnrichedFounderVerification[]> {
  if (rows.length === 0) return []
  const emails = [...new Set(rows.map((r) => r.email.toLowerCase()))]
  const founders = await db.founder.findMany({
    where: {
      OR: emails.map((e) => ({ email: { equals: e, mode: 'insensitive' } })),
    },
    select: { email: true, name: true },
  })
  const map = new Map(founders.map((f) => [f.email.toLowerCase(), f.name]))
  return rows.map((r) => ({
    ...r,
    founderName: map.get(r.email.toLowerCase()) ?? null,
  }))
}

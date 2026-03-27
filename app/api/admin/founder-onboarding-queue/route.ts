import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const WINDOW_NO_QUERY = 450
const LIMIT_DEFAULT = 28
const LIMIT_MAX = 60

function idPreviewKind(url: string | null | undefined): 'pdf' | 'image' | 'unknown' {
  if (!url) return 'unknown'
  const base = url.split('?')[0].toLowerCase()
  if (base.endsWith('.pdf')) return 'pdf'
  if (/\.(png|jpe?g|webp|gif)$/i.test(base)) return 'image'
  return 'unknown'
}

function activityMs(
  a: { createdAt: Date; reviewedAt: Date | null } | null,
  v: { submittedAt: Date; verifiedAt: Date | null } | null
): number {
  const times: number[] = []
  if (a?.createdAt) times.push(new Date(a.createdAt).getTime())
  if (a?.reviewedAt) times.push(new Date(a.reviewedAt).getTime())
  if (v?.submittedAt) times.push(new Date(v.submittedAt).getTime())
  if (v?.verifiedAt) times.push(new Date(v.verifiedAt).getTime())
  return times.length ? Math.max(...times) : 0
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentUser(false)
    if (!admin || !isAdminEmail(admin.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const qRaw = (searchParams.get('q') || '').trim()
    const q = qRaw.slice(0, 120)
    let skip = parseInt(searchParams.get('skip') || '0', 10)
    if (Number.isNaN(skip) || skip < 0) skip = 0
    let limit = parseInt(searchParams.get('limit') || String(LIMIT_DEFAULT), 10)
    if (Number.isNaN(limit) || limit < 1) limit = LIMIT_DEFAULT
    limit = Math.min(limit, LIMIT_MAX)

    let approvalRows: Awaited<ReturnType<typeof db.userApproval.findMany>>
    let verificationRows: Awaited<ReturnType<typeof db.founderVerification.findMany>>
    let extraEmailsFromFounders: { email: string; name: string | null }[] = []

    if (q.length > 0) {
      const [a, v, founders] = await Promise.all([
        db.userApproval.findMany({
          where: { email: { contains: q, mode: 'insensitive' } },
          orderBy: { createdAt: 'desc' },
          take: 120,
        }),
        db.founderVerification.findMany({
          where: { email: { contains: q, mode: 'insensitive' } },
          orderBy: { submittedAt: 'desc' },
          take: 120,
        }),
        db.founder.findMany({
          where: {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: { email: true, name: true },
          take: 80,
        }),
      ])
      approvalRows = a
      verificationRows = v
      extraEmailsFromFounders = founders
    } else {
      const [a, v] = await Promise.all([
        db.userApproval.findMany({
          orderBy: { createdAt: 'desc' },
          take: WINDOW_NO_QUERY,
        }),
        db.founderVerification.findMany({
          orderBy: { submittedAt: 'desc' },
          take: WINDOW_NO_QUERY,
        }),
      ])
      approvalRows = a
      verificationRows = v
    }

    const emailSet = new Set<string>()
    for (const r of approvalRows) emailSet.add(r.email.toLowerCase())
    for (const r of verificationRows) emailSet.add(r.email.toLowerCase())
    for (const f of extraEmailsFromFounders) emailSet.add(f.email.toLowerCase())

    const emails = [...emailSet]
    if (emails.length === 0) {
      return NextResponse.json({
        success: true,
        items: [],
        hasMore: false,
        skip,
        limit,
        q,
      })
    }

    const canonicalEmail = new Map<string, string>()
    for (const r of approvalRows) canonicalEmail.set(r.email.toLowerCase(), r.email)
    for (const r of verificationRows) canonicalEmail.set(r.email.toLowerCase(), r.email)
    for (const f of extraEmailsFromFounders) {
      const k = f.email.toLowerCase()
      if (!canonicalEmail.has(k)) canonicalEmail.set(k, f.email)
    }

    const [fullApprovals, fullVerifications, founderNames] = await Promise.all([
      db.userApproval.findMany({ where: { email: { in: emails } } }),
      db.founderVerification.findMany({ where: { email: { in: emails } } }),
      db.founder.findMany({
        where: { email: { in: emails } },
        select: { email: true, name: true },
      }),
    ])

    const approvalByEmail = new Map(fullApprovals.map((r) => [r.email.toLowerCase(), r]))
    const verificationByEmail = new Map(fullVerifications.map((r) => [r.email.toLowerCase(), r]))
    for (const r of fullApprovals) canonicalEmail.set(r.email.toLowerCase(), r.email)
    for (const r of fullVerifications) canonicalEmail.set(r.email.toLowerCase(), r.email)
    const nameByEmail = new Map(founderNames.map((f) => [f.email.toLowerCase(), f.name]))
    for (const f of extraEmailsFromFounders) {
      const k = f.email.toLowerCase()
      if (f.name && !nameByEmail.has(k)) nameByEmail.set(k, f.name)
    }

    type Merged = {
      email: string
      founderName: string | null
      signupStatus: 'pending' | 'approved' | 'rejected' | null
      signupCreatedAt: string | null
      signupReviewedAt: string | null
      idStatus: string | null
      idSubmittedAt: string | null
      idVerifiedAt: string | null
      hasIdFile: boolean
      idPreviewKind: 'pdf' | 'image' | 'unknown'
      lastActivityAt: string
      _sort: number
    }

    const merged: Merged[] = emails.map((key) => {
      const approval = approvalByEmail.get(key) ?? null
      const verification = verificationByEmail.get(key) ?? null
      const email = canonicalEmail.get(key) ?? approval?.email ?? verification?.email ?? key
      const founderName = nameByEmail.get(key) ?? null
      const sort = activityMs(approval, verification)
      const last = sort > 0 ? new Date(sort).toISOString() : new Date(0).toISOString()

      return {
        email,
        founderName,
        signupStatus: approval
          ? (approval.status as 'pending' | 'approved' | 'rejected')
          : null,
        signupCreatedAt: approval?.createdAt?.toISOString() ?? null,
        signupReviewedAt: approval?.reviewedAt?.toISOString() ?? null,
        idStatus: verification?.status ?? null,
        idSubmittedAt: verification?.submittedAt?.toISOString() ?? null,
        idVerifiedAt: verification?.verifiedAt?.toISOString() ?? null,
        hasIdFile: Boolean(verification?.url),
        idPreviewKind: idPreviewKind(verification?.url ?? null),
        lastActivityAt: last,
        _sort: sort,
      }
    })

    merged.sort((a, b) => b._sort - a._sort)

    const slice = merged.slice(skip, skip + limit + 1)
    const hasMore = slice.length > limit
    const page = hasMore ? slice.slice(0, limit) : slice

    const items = page.map(({ _sort: _s, ...rest }) => rest)

    return NextResponse.json({
      success: true,
      items,
      hasMore,
      skip,
      limit,
      q,
    })
  } catch (error: unknown) {
    console.error('Founder onboarding queue error:', error)
    return NextResponse.json({ error: 'Failed to load queue' }, { status: 500 })
  }
}

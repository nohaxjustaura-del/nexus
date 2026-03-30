import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isAdminEmail } from '@/lib/constants'
import { db } from '@/lib/db'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  YcInsiderRequestsAdminList,
  type YcInsiderRequestRow,
} from '@/components/yc-insider-requests-admin-list'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function YcInsiderRequestsAdminPage() {
  const user = await getCurrentUser(false)
  if (!user || !isAdminEmail(user.email)) {
    redirect('/')
  }

  let rows: YcInsiderRequestRow[] = []
  let loadError: string | null = null

  try {
    const dbRows = await db.yCInsiderFounderRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    rows = dbRows.map((r) => ({
      id: r.id,
      userEmail: r.userEmail,
      founderKey: r.founderKey,
      requestType: r.requestType,
      topic: r.topic,
      timezone: r.timezone,
      message: r.message,
      status: r.status || 'new',
      createdAt: r.createdAt.toISOString(),
    }))
  } catch (e) {
    console.error('YC Insider admin queue load error:', e)
    loadError =
      'Could not load requests. If you recently deployed schema changes, run database migrations (Prisma) so the YCInsiderFounderRequest table matches the app.'
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/dashboard" className="font-medium text-primary hover:underline">
              ← Admin overview
            </Link>
          </p>
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            YC Insider founder requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask and Book submissions from premium users on{' '}
            <Link href="/founder/yc-insider" className="text-primary hover:underline">
              /founder/yc-insider
            </Link>
            . New entries email admins (when <code className="rounded bg-muted px-1">RESEND_API_KEY</code> and{' '}
            <code className="rounded bg-muted px-1">ADMIN_EMAIL</code> are set). Update pipeline status here after you
            follow up.
          </p>
        </div>

        {loadError ? (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive">Queue unavailable</CardTitle>
              <CardDescription>{loadError}</CardDescription>
            </CardHeader>
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No requests yet</CardTitle>
              <CardDescription>Submissions will appear here when premium users use Ask or Book.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <YcInsiderRequestsAdminList rows={rows} />
        )}
      </div>
    </div>
  )
}

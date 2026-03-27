import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isAdminEmail } from '@/lib/constants'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Calendar } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function founderLabel(key: string) {
  if (key === 'william') return 'William Namgyal'
  if (key === 'inigo') return 'Inigo Lenderking'
  return key
}

export default async function YcInsiderRequestsAdminPage() {
  const user = await getCurrentUser(false)
  if (!user || !isAdminEmail(user.email)) {
    redirect('/')
  }

  const rows = await db.yCInsiderFounderRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

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
            .
          </p>
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No requests yet</CardTitle>
              <CardDescription>Submissions will appear here when premium users use Ask or Book.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <ul className="space-y-4">
            {rows.map((r) => (
              <li key={r.id}>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-normal">
                        {founderLabel(r.founderKey)}
                      </Badge>
                      {r.requestType === 'book' ? (
                        <Badge className="gap-1 bg-violet-600 text-white hover:bg-violet-600">
                          <Calendar className="h-3 w-3" aria-hidden />
                          Book
                        </Badge>
                      ) : (
                        <Badge className="gap-1 bg-sky-600 text-white hover:bg-sky-600">
                          <MessageSquare className="h-3 w-3" aria-hidden />
                          Ask
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <CardTitle className="text-base font-medium">{r.userEmail}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{r.message}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

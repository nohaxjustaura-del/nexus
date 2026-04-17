import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { loadFounderAnalysisById } from '@/lib/analysis/load-founder-analysis'
import { PitchAnalysisReport } from '@/components/analysis/PitchAnalysisReport'
import { ArrowLeft, FileBarChart } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function typeLabel(t: string) {
  switch (t) {
    case 'unified-pitch':
      return 'Pitch analysis'
    case 'video-pitch':
      return 'Video pitch'
    case 'pitch-deck':
      return 'Pitch deck'
    case 'pitch-idea':
      return 'Pitch idea'
    default:
      return 'Analysis'
  }
}

export default async function FounderAnalysisDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getCurrentUser(false)
  if (!user?.email) {
    redirect('/login')
  }

  const founder = await db.founder.findUnique({
    where: { email: user.email },
    select: { id: true },
  })
  if (!founder) {
    notFound()
  }

  const row = await loadFounderAnalysisById(founder.id, params.id)
  if (!row) {
    notFound()
  }

  const title = typeLabel(row.type)
  const when = new Date(row.createdAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-6 md:py-8">
        <div className="mb-6">
          <Link
            href="/founder/my-analyses"
            className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            My analyses
          </Link>
        </div>

        <header className="mb-8 border-b border-border pb-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <FileBarChart className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
              <p className="text-sm text-muted-foreground">{when}</p>
              {row.fileName && (
                <p className="truncate text-xs text-muted-foreground" title={row.fileName}>
                  {row.fileName}
                </p>
              )}
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Full rubric breakdown, narrative feedback, and investor matches from this run. Scores and section detail
            are saved with your account.
          </p>
        </header>

        <PitchAnalysisReport result={row.result} />
      </div>
    </div>
  )
}

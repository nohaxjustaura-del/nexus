'use client'

import Link from 'next/link'
import { UnifiedPitchTab } from '@/components/ai-analysis/unified-pitch-tab'

export default function AIAnalysisPage() {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-page-mesh" aria-hidden />
      <div className="page-shell-narrow">
        <div className="mx-auto w-full max-w-3xl pb-12">
          <header className="mb-8 border-b border-border pb-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
                Analyze your pitch
              </h1>
              <Link
                href="/founder/my-analyses"
                className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Past reports and scores
              </Link>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Full pitch review</span> uses one submission: structured
              Q&A plus any deck, video, and written context you want to include. Everything is merged for scoring,
              feedback, and investor matching.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Content stays private and is removed automatically after 30–90 days.
            </p>
          </header>

          <UnifiedPitchTab />
        </div>
      </div>
    </div>
  )
}

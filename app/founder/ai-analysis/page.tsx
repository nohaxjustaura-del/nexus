'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import Link from 'next/link'
import { Layers, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

const UnifiedPitchTab = dynamic(
  () => import('@/components/ai-analysis/unified-pitch-tab').then((m) => ({ default: m.UnifiedPitchTab })),
  { loading: () => <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div> }
)

const PitchIdeaAnalysisTab = dynamic(
  () => import('@/components/ai-analysis/pitch-idea-tab').then((m) => ({ default: m.PitchIdeaAnalysisTab })),
  { loading: () => <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div> }
)

type AnalysisMode = 'unified' | 'pitch-idea'

export default function AIAnalysisPage() {
  const [mode, setMode] = useState<AnalysisMode>('unified')

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-page-mesh" aria-hidden />
      <div className="page-shell-narrow">
        <div className="mx-auto w-full max-w-3xl pb-12">
          <header className="mb-8 border-b border-border/50 pb-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
                Analyze your pitch
              </h1>
              <Link
                href="/founder/my-analyses"
                className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                View reports
              </Link>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {mode === 'unified' ? (
                <>
                  <span className="font-medium text-foreground">Pitch analysis</span>: analyze deck, video, and context together.
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">Pitch idea</span>: fast concept-only pass.
                </>
              )}
            </p>
          </header>

          <div className="mx-auto mb-8 flex w-full max-w-xl justify-center px-1">
            <div
              role="tablist"
              aria-label="Choose analysis type"
              className="grid w-full grid-cols-2 gap-1 rounded-full border border-border/70 bg-card p-1 sm:p-1.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'unified'}
                className={cn(
                  'flex min-h-[3rem] items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition-colors sm:min-h-[3.25rem] sm:px-4 sm:text-[0.9375rem]',
                  mode === 'unified'
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border/70'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setMode('unified')}
              >
                <Layers className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                <span className="text-center leading-tight">Pitch analysis</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'pitch-idea'}
                className={cn(
                  'flex min-h-[3rem] items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition-colors sm:min-h-[3.25rem] sm:px-4 sm:text-[0.9375rem]',
                  mode === 'pitch-idea'
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border/70'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setMode('pitch-idea')}
              >
                <Lightbulb className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                <span className="text-center leading-tight">Pitch idea</span>
              </button>
            </div>
          </div>

          {mode === 'unified' ? <UnifiedPitchTab /> : <PitchIdeaAnalysisTab />}
        </div>
      </div>
    </div>
  )
}

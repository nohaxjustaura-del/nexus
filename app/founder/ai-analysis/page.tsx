'use client'

import { useState } from 'react'
import { Layers, FileText, Video, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UnifiedPitchTab } from '@/components/ai-analysis/unified-pitch-tab'
import { PitchDeckAnalysisTab } from '@/components/ai-analysis/pitch-deck-tab'
import { VideoPitchAnalysisTab } from '@/components/ai-analysis/video-pitch-tab'
import { PitchIdeaAnalysisTab } from '@/components/ai-analysis/pitch-idea-tab'

type TabId = 'unified' | 'deck' | 'video' | 'idea'

const TABS: { id: TabId; label: string; short: string; Icon: typeof Layers }[] = [
  { id: 'unified', label: 'Unified', short: 'Q&A + deck + video', Icon: Layers },
  { id: 'deck', label: 'Pitch deck', short: 'Deck file only', Icon: FileText },
  { id: 'video', label: 'Video pitch', short: 'Video file only', Icon: Video },
  { id: 'idea', label: 'Pitch idea', short: 'Text or file', Icon: Lightbulb },
]

export default function AIAnalysisPage() {
  const [tab, setTab] = useState<TabId>('unified')

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-page-mesh" aria-hidden />
      <div className="page-shell-narrow">
        <header className="mb-8 border-b border-border pb-8">
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            Analyze your pitch
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Unified</span> is the recommended path: structured Q&A plus
            optional deck and/or video in one submission. We merge sources for scoring, narrative feedback, and investor
            matching using the same multi-pass pipeline as single-modality tabs—with UNIFIED-aware fact extraction and
            category copy when you combine materials. Use the other tabs when you only have one asset type.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Content stays private and is removed automatically after 30–90 days.
          </p>
        </header>

        <div
          className="mb-8 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Analysis type"
        >
          {TABS.map(({ id, label, short, Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                id={`ai-tab-${id}`}
                aria-controls={`ai-panel-${id}`}
                onClick={() => setTab(id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                <span>
                  <span className="font-medium">{label}</span>
                  <span className="mt-0.5 block text-xs font-normal opacity-80">{short}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="pb-12">
          {/* Keep panels mounted so in-flight analysis and results survive tab switches (hidden ≠ unmount). */}
          <div
            id="ai-panel-unified"
            role="tabpanel"
            aria-labelledby="ai-tab-unified"
            hidden={tab !== 'unified'}
            className={tab === 'unified' ? '' : 'hidden'}
          >
            <UnifiedPitchTab />
          </div>
          <div
            id="ai-panel-deck"
            role="tabpanel"
            aria-labelledby="ai-tab-deck"
            hidden={tab !== 'deck'}
            className={tab === 'deck' ? '' : 'hidden'}
          >
            <PitchDeckAnalysisTab />
          </div>
          <div
            id="ai-panel-video"
            role="tabpanel"
            aria-labelledby="ai-tab-video"
            hidden={tab !== 'video'}
            className={tab === 'video' ? '' : 'hidden'}
          >
            <VideoPitchAnalysisTab />
          </div>
          <div
            id="ai-panel-idea"
            role="tabpanel"
            aria-labelledby="ai-tab-idea"
            hidden={tab !== 'idea'}
            className={tab === 'idea' ? '' : 'hidden'}
          >
            <PitchIdeaAnalysisTab />
          </div>
        </div>
      </div>
    </div>
  )
}

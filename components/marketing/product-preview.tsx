'use client'

import { useEffect, useRef } from 'react'
import { BarChart3, CheckCircle, Sparkles, Target, TrendingUp } from 'lucide-react'

const mockScores = [
  { label: 'Market', score: 82, color: 'bg-emerald-500' },
  { label: 'Team', score: 74, color: 'bg-primary' },
  { label: 'Traction', score: 68, color: 'bg-amber-500' },
  { label: 'Product', score: 88, color: 'bg-emerald-500' },
]

const mockMatches = [
  { firm: 'Sequoia Capital', fit: 94, stage: 'Series A', reason: 'Strong market fit, thesis alignment' },
  { firm: 'Andreessen Horowitz', fit: 89, stage: 'Seed–A', reason: 'Product-led growth focus' },
  { firm: 'Founders Fund', fit: 85, stage: 'Seed', reason: 'Deep-tech thesis match' },
]

export function ProductPreview() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      el?.classList.add('in-view')
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in-view')
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="relative overflow-hidden border-b border-border/30 py-10 sm:py-14" aria-label="Product preview">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute left-1/2 top-0 h-64 w-[min(100%,48rem)] -translate-x-1/2 rounded-[100%] bg-primary/[0.04] blur-[60px]" />
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          ref={ref}
          className="io-stagger mx-auto max-w-5xl"
        >
          <p className="io-item text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            What you get
          </p>
          <h2 className="io-item mt-3 text-center font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Scored feedback and a ranked shortlist, not a generic PDF
          </h2>

          {/* Mock dashboard */}
          <div className="io-item mt-8 overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-xl shadow-black/[0.08] ring-1 ring-border/20">
            {/* Chrome bar */}
            <div className="flex items-center gap-2 border-b border-border/40 bg-muted/30 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
              <span className="ml-3 font-mono text-[11px] text-muted-foreground">nexus - pitch analysis</span>
            </div>

            <div className="grid gap-px bg-border/30 md:grid-cols-[1fr_1.2fr]">
              {/* Left: Score breakdown */}
              <div className="bg-card p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Pitch Score</h3>
                  <span className="ml-auto rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    78/100
                  </span>
                </div>
                <div className="space-y-3">
                  {mockScores.map((s) => (
                    <div key={s.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{s.label}</span>
                        <span className="tabular-nums text-muted-foreground">{s.score}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                        <div
                          className={`h-full rounded-full ${s.color} transition-all duration-700`}
                          style={{ width: `${s.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-lg border border-border/40 bg-muted/20 p-3">
                  <div className="mb-2 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-foreground">Key insight</span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Strong product thesis. Traction section needs concrete metrics; add MRR or user count to strengthen the ask.
                  </p>
                </div>
              </div>

              {/* Right: Investor matches */}
              <div className="bg-card p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Top Investor Matches</h3>
                  <span className="ml-auto text-xs text-muted-foreground">Ranked by fit</span>
                </div>
                <div className="space-y-2.5">
                  {mockMatches.map((m, i) => (
                    <div
                      key={m.firm}
                      className="rounded-xl border border-border/50 bg-background/60 p-3 transition-colors hover:border-primary/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                              {i + 1}
                            </span>
                            <span className="truncate text-sm font-medium text-foreground">{m.firm}</span>
                          </div>
                          <p className="mt-1 pl-7 text-xs text-muted-foreground">{m.reason}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
                            {m.fit}%
                          </span>
                          <span className="text-[10px] text-muted-foreground">{m.stage}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.04] p-3">
                  <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs text-foreground/80">
                    Each match includes thesis fit, talking points, and application links.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

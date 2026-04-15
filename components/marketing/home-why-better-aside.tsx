'use client'

import { useEffect, useRef } from 'react'
import { BadgeCheck, BrainCircuit, Check, Workflow } from 'lucide-react'
import { BRAND_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

export type HomeWhyBetterAsideProps = {
  verifiedInvestorCountLabel: string
}

export function HomeWhyBetterAside({ verifiedInvestorCountLabel }: HomeWhyBetterAsideProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
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
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const pillars = [
    {
      icon: BrainCircuit,
      title: 'Structured Intake',
      text: 'Capture your deck and answers once, then run an investor-fit workflow built for fundraising.',
    },
    {
      icon: BadgeCheck,
      title: 'Evidence-Backed Fit',
      text: 'Matches are tied to verified mandates and live checks, not loose keyword overlap.',
    },
    {
      icon: Workflow,
      title: 'Actionable Output',
      text: 'Get fit score, rationale, and next-step talking points in the same flow.',
    },
  ] as const

  const compareRows = [
    {
      generic: 'Fluent summary from one prompt',
      nexus: "Multi-pass read that stress-tests claims like a partner's first pass",
    },
    {
      generic: 'General suggestions with limited source grounding',
      nexus: `${verifiedInvestorCountLabel}+ maintained investor profiles with mandate-level signal`,
    },
    {
      generic: 'Ends as a chat response',
      nexus: 'Shortlist, bookmarks, and outreach-ready next actions on real targets',
    },
  ]

  return (
    <div
      ref={containerRef}
      className={cn(
        'io-stagger rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 shadow-sm ring-1 ring-primary/10 sm:p-6',
      )}
    >
      <p className="io-item text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Why not a spreadsheet or a generic chatbot?
      </p>
      <h3
        id="home-why-better-heading"
        className="mt-3 font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl"
      >
        Built for fundraising, not generic LLM output.
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {BRAND_NAME} pairs allocator-style analysis with a verified investor graph, so you get fit-ranked targets you can
        actually move forward with.
      </p>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {pillars.map((pillar) => {
          const Icon = pillar.icon
          return (
            <div
              key={pillar.title}
              className="io-item rounded-xl border border-primary/15 bg-background/50 p-3 ring-1 ring-primary/10"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" strokeWidth={2.1} aria-hidden />
                <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-foreground/90">{pillar.title}</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{pillar.text}</p>
            </div>
          )
        })}
      </div>

      <div className="io-item mt-4 rounded-xl border border-border/70 bg-background/40 p-3">
        <div className="hidden grid-cols-2 gap-2 border-b border-border/60 pb-2 sm:grid">
          <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Generic LLM</p>
          <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-primary">NEXUS</p>
        </div>
        <ul className="mt-2 space-y-2">
          {compareRows.map((row) => (
            <li key={row.generic} className="grid grid-cols-1 gap-2 text-xs leading-relaxed sm:grid-cols-2">
              <p className="rounded-md border border-border/50 bg-background/60 p-2 text-muted-foreground">
                <span className="mb-1 block text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground sm:hidden">
                  Generic LLM
                </span>
                {row.generic}
              </p>
              <p className="rounded-md border border-primary/20 bg-primary/[0.06] p-2 text-foreground/90">
                <span className="mb-1 block text-[10px] font-mono uppercase tracking-[0.12em] text-primary sm:hidden">
                  NEXUS
                </span>
                {row.nexus}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <p className="io-item mt-4 flex items-start gap-2.5 text-sm leading-snug">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} aria-hidden />
        <span className="min-w-0 text-foreground/90">
          Backed by {verifiedInvestorCountLabel}+ verified profiles, quality-checked and maintained for current mandate fit.
        </span>
      </p>
    </div>
  )
}

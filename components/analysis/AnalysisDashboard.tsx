'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { UniversalAnalysisResult, CategoryScore } from '@/lib/universal-analysis-engine'
import {
  Flame,
  Shield,
  UserCheck,
  Rocket,
  Presentation,
  ChevronDown,
  BadgeCheck,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

interface CategoryMeta {
  key: keyof UniversalAnalysisResult['categories']
  label: string
  weight: string
  icon: React.ElementType
  liveVerified: boolean
}

const CATEGORIES: CategoryMeta[] = [
  { key: 'market',     label: 'Market Heat',        weight: '30%', icon: Flame,        liveVerified: true },
  { key: 'moat',       label: 'Moat Integrity',     weight: '25%', icon: Shield,       liveVerified: true },
  { key: 'founderFit', label: 'Founder-Market Fit',  weight: '20%', icon: UserCheck,    liveVerified: false },
  { key: 'momentum',   label: 'Strategic Momentum',  weight: '25%', icon: Rocket,       liveVerified: false },
  { key: 'execution',  label: 'Execution',           weight: '-',   icon: Presentation, liveVerified: false },
]

// ---------------------------------------------------------------------------
// Score tier helpers
// ---------------------------------------------------------------------------

type Tier = 'critical' | 'medium' | 'high' | 'elite'

function getTier(score: number): Tier {
  if (score >= 90) return 'elite'
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'critical'
}

const TIER_BAR_CLASS: Record<Tier, string> = {
  critical: 'bg-red-500',
  medium:   'bg-orange-400',
  high:     'bg-blue-500',
  elite:    'bg-gradient-to-r from-emerald-400 to-amber-400',
}

const TIER_LABEL: Record<Tier, string> = {
  critical: 'Critical',
  medium:   'Developing',
  high:     'Strong',
  elite:    'Exceptional',
}

const TIER_TEXT_CLASS: Record<Tier, string> = {
  critical: 'text-red-500 dark:text-red-400',
  medium:   'text-orange-500 dark:text-orange-400',
  high:     'text-blue-500 dark:text-blue-400',
  elite:    'text-emerald-500 dark:text-emerald-400',
}

// ---------------------------------------------------------------------------
// Live Verified badge
// ---------------------------------------------------------------------------

function LiveVerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      Live Verified
    </span>
  )
}

// ---------------------------------------------------------------------------
// Single tile
// ---------------------------------------------------------------------------

interface TileProps {
  meta: CategoryMeta
  data: CategoryScore
  isOpen: boolean
  onToggle: () => void
  isLast: boolean
  compact?: boolean
  showLiveVerified?: boolean
}

function AnalysisTile({
  meta,
  data,
  isOpen,
  onToggle,
  isLast,
  compact,
  showLiveVerified = true,
}: TileProps) {
  const tier = getTier(data.score)
  const Icon = meta.icon

  return (
    <motion.div
      layout={!compact}
      className={cn(
        'relative z-10 cursor-pointer select-none overflow-hidden rounded-xl',
        'border border-border bg-card text-card-foreground shadow-sm',
        'transition-shadow hover:shadow-md',
        !isLast && (compact ? '-mb-1.5' : '-mb-2.5'),
      )}
      style={{ zIndex: isOpen ? 20 : undefined }}
      onClick={onToggle}
    >
      {/* Header row */}
      <div className={cn('flex items-center gap-3', compact ? 'px-3.5 py-3 sm:px-4' : 'px-5 py-4')}>
        <div
          className={cn(
            'flex items-center justify-center rounded-lg bg-muted',
            compact ? 'h-8 w-8' : 'h-9 w-9',
            TIER_TEXT_CLASS[tier],
          )}
        >
          <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        </div>

        <div className="flex flex-1 flex-col gap-0.5 sm:gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn('font-semibold leading-none', compact ? 'text-[13px]' : 'text-sm')}>
              {meta.label}
            </span>
            <span className={cn('text-muted-foreground', compact ? 'text-[10px]' : 'text-[11px]')}>
              ({meta.weight})
            </span>
            {meta.liveVerified && showLiveVerified && <LiveVerifiedBadge />}
          </div>

          {/* Bar */}
          <div className={cn('w-full overflow-hidden rounded-full bg-muted', compact ? 'h-1.5' : 'h-2')}>
            <motion.div
              className={cn('h-full rounded-full', TIER_BAR_CLASS[tier])}
              initial={compact ? false : { width: 0 }}
              animate={{ width: `${data.score}%` }}
              transition={{ duration: compact ? 0.35 : 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Score + tier label */}
        <div className="flex flex-col items-end gap-0.5">
          <span
            className={cn(
              'font-bold tabular-nums leading-none',
              compact ? 'text-base' : 'text-lg',
              TIER_TEXT_CLASS[tier],
            )}
          >
            {data.score}
          </span>
          <span
            className={cn(
              'font-medium uppercase tracking-wider',
              compact ? 'text-[9px]' : 'text-[10px]',
              TIER_TEXT_CLASS[tier],
            )}
          >
            {TIER_LABEL[tier]}
          </span>
        </div>

        {/* Chevron */}
        <motion.div
          initial={compact ? false : undefined}
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: compact ? 0.15 : 0.25 }}
        >
          <ChevronDown className={cn('text-muted-foreground', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
        </motion.div>
      </div>

      {/* Expandable bullets */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="bullets"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className={cn('border-t border-border', compact ? 'px-3.5 pb-3.5 pt-3 sm:px-4' : 'px-5 pb-5 pt-4')}>
              <ul className={compact ? 'space-y-2' : 'space-y-3'}>
                {data.bullets.map((bullet, i) => (
                  <motion.li
                    key={i}
                    initial={compact ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: compact ? 0 : i * 0.08 }}
                    className={cn(
                      'flex gap-2 leading-relaxed text-foreground/90',
                      compact ? 'text-xs sm:text-[13px]' : 'text-sm',
                    )}
                  >
                    <span className={cn('mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full', TIER_BAR_CLASS[tier])} />
                    <span>{bullet}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface AnalysisDashboardProps {
  result: UniversalAnalysisResult
  /** Pre-computed final score from runScoringPipeline(). When provided, shown
   *  directly in the header card instead of recalculating from category weights. */
  finalScore?: number
  /** Omit weighted header and analyst verdict for compact embeds (e.g. marketing). */
  tilesOnly?: boolean
  /** Tighter padding / typography for landing-page embeds. */
  compact?: boolean
  /** Which category row starts expanded; `null` means all collapsed. */
  defaultOpenKey?: keyof UniversalAnalysisResult['categories'] | null
  /** Set false for marketing embeds where “live verified” badges read as noise. */
  showLiveVerified?: boolean
}

/** Fallback: equal-weighted average of all non-null category scores. */
function averageCategoryScore(result: UniversalAnalysisResult): number {
  const scores = Object.values(result.categories)
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .map((c) => c.score)
  if (scores.length === 0) return 0
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

export default function AnalysisDashboard({
  result,
  finalScore,
  tilesOnly,
  compact,
  defaultOpenKey = null,
  showLiveVerified = true,
}: AnalysisDashboardProps) {
  const [openKey, setOpenKey] = useState<string | null>(() =>
    defaultOpenKey != null ? String(defaultOpenKey) : null,
  )

  const visibleCategories = CATEGORIES.filter(
    (cat) => result.categories[cat.key] !== null,
  )

  const toggle = (key: string) => setOpenKey((prev) => (prev === key ? null : key))

  const displayScore =
    !tilesOnly ? (finalScore ?? averageCategoryScore(result)) : null

  return (
    <div className={cn(!tilesOnly && 'space-y-6')}>
      {/* Weighted overall score */}
      {!tilesOnly && displayScore != null && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Weighted Rubric Score
            </p>
            <p className={cn('text-3xl font-bold tabular-nums', TIER_TEXT_CLASS[getTier(displayScore)])}>
              {displayScore}<span className="text-lg text-muted-foreground">/100</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <BadgeCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-xs">2026 Institutional Rubric</span>
          </div>
        </div>
      )}

      {/* Stacked tiles */}
      <div className="relative">
        {visibleCategories.map((cat, i) => {
          const data = result.categories[cat.key]
          if (!data) return null
          return (
            <AnalysisTile
              key={cat.key}
              meta={cat}
              data={data}
              isOpen={openKey === cat.key}
              onToggle={() => toggle(cat.key)}
              isLast={i === visibleCategories.length - 1}
              compact={compact}
              showLiveVerified={showLiveVerified}
            />
          )
        })}
      </div>

      {/* Global verdict */}
      {!tilesOnly && result.globalVerdict && (
        <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Analyst Verdict
          </p>
          <p className="text-sm leading-relaxed text-foreground/90">
            {result.globalVerdict}
          </p>
        </div>
      )}
    </div>
  )
}


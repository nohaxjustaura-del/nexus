'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UniversityProgramMatch } from '@/lib/matching/types'
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ExternalLink,
  GraduationCap,
  Zap,
} from 'lucide-react'
import { useState } from 'react'

interface UniversityProgramsSectionProps {
  programs: UniversityProgramMatch[]
  /** If true the section starts collapsed. Defaults to false (open). */
  defaultCollapsed?: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCheckSize(min: number | null, max: number | null): string {
  if (min === null && max === null) return 'Non-dilutive / varies'
  const fmt = (n: number) => (n >= 1000 ? `$${n / 1000}M` : `$${n}K`)
  if (min === null) return `Up to ${fmt(max!)}`
  if (max === null) return `${fmt(min)}+`
  if (min === max) return fmt(min)
  return `${fmt(min)}–${fmt(max)}`
}

function urgencyConfig(urgency: UniversityProgramMatch['urgency']) {
  if (urgency === 'apply_now') {
    return { label: 'Apply Now', className: 'bg-red-100 text-red-700 border-red-200' }
  }
  if (urgency === 'upcoming_deadline') {
    return { label: 'Deadline Soon', className: 'bg-amber-100 text-amber-700 border-amber-200' }
  }
  return { label: 'Rolling', className: 'bg-slate-100 text-slate-600 border-slate-200' }
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    accelerator: 'Accelerator',
    fund: 'Fund',
    angel_network: 'Angel Network',
    grant: 'Grant',
    fellowship: 'Fellowship',
  }
  return map[type] ?? type
}

// ── Single program card ───────────────────────────────────────────────────────

function ProgramCard({ match }: { match: UniversityProgramMatch }) {
  const { program, qualificationReason, urgency } = match
  const { label: urgencyLabel, className: urgencyClass } = urgencyConfig(urgency)
  const isOpen = !!program.isOpenAccelerator

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border p-4 transition-shadow hover:shadow-md ${
        isOpen
          ? 'border-violet-200 bg-gradient-to-br from-violet-50/60 to-purple-50/40'
          : 'border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-teal-50/40'
      }`}
    >
      {/* Row 1: name + badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 leading-tight truncate">{program.name}</p>
          {program.university && !isOpen && (
            <p className="text-xs text-slate-500 mt-0.5">{program.university}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1 shrink-0">
          <Badge
            variant="outline"
            className={`text-xs font-medium ${urgencyClass}`}
          >
            <CalendarClock className="h-3 w-3 mr-1" />
            {urgencyLabel}
          </Badge>
          {isOpen ? (
            <Badge className="text-xs bg-violet-100 text-violet-700 border border-violet-200">
              <Zap className="h-3 w-3 mr-1" />
              Open to All
            </Badge>
          ) : (
            <Badge className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200">
              <GraduationCap className="h-3 w-3 mr-1" />
              {typeLabel(program.type)}
            </Badge>
          )}
        </div>
      </div>

      {/* Row 2: check size + stage */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-slate-400" />
          {formatCheckSize(program.checkSize.min, program.checkSize.max)}
        </span>
        {program.stageFocus.length > 0 && (
          <span className="text-slate-400">·</span>
        )}
        {program.stageFocus.length > 0 && (
          <span>{program.stageFocus.join(', ')}</span>
        )}
      </div>

      {/* Row 3: why you qualify */}
      <div className="flex items-start gap-2 rounded-lg bg-white/70 border border-white px-3 py-2">
        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" />
        <p className="text-xs text-slate-700 leading-relaxed">{qualificationReason}</p>
      </div>

      {/* Row 4: description */}
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
        {program.description}
      </p>

      {/* Row 5: apply button */}
      <a
        href={program.applicationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto"
      >
        <Button
          size="sm"
          variant="outline"
          className={`w-full text-xs font-medium gap-1.5 ${
            isOpen
              ? 'border-violet-300 text-violet-700 hover:bg-violet-50'
              : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          Apply to {program.name}
          <ExternalLink className="h-3 w-3" />
        </Button>
      </a>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

export function UniversityProgramsSection({
  programs,
  defaultCollapsed = false,
}: UniversityProgramsSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  if (programs.length === 0) return null

  const exclusivePrograms = programs.filter((m) => !m.program.isOpenAccelerator)
  const openAccelerators = programs.filter((m) => !!m.program.isOpenAccelerator)

  return (
    <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/40 via-white to-violet-50/30 shadow-sm">
      <CardHeader className="pb-3">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-between w-full text-left gap-3 group"
          aria-expanded={!collapsed}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <BookOpen className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Programs &amp; Accelerators You Qualify For
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {exclusivePrograms.length > 0 && (
                  <span>{exclusivePrograms.length} exclusive to you</span>
                )}
                {exclusivePrograms.length > 0 && openAccelerators.length > 0 && (
                  <span className="mx-1">·</span>
                )}
                {openAccelerators.length > 0 && (
                  <span>{openAccelerators.length} open to all founders</span>
                )}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors">
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </div>
        </button>
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-0 space-y-6">
          {/* Student / alumni exclusive programs */}
          {exclusivePrograms.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-700">
                  University-Affiliated Programs
                </h3>
                <span className="text-xs text-slate-400">(based on your background)</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {exclusivePrograms.map((match) => (
                  <ProgramCard key={match.program.id} match={match} />
                ))}
              </div>
            </div>
          )}

          {/* Open accelerators */}
          {openAccelerators.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-violet-600" />
                <h3 className="text-sm font-semibold text-slate-700">
                  Open Accelerators
                </h3>
                <span className="text-xs text-slate-400">(no university requirement)</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {openAccelerators.map((match) => (
                  <ProgramCard key={match.program.id} match={match} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export default UniversityProgramsSection

import { CheckCircle, X } from 'lucide-react'

const comparisonRows = [
  { feature: 'Searchable verified investor database', nexus: true, pitchbook: true },
  { feature: 'AI pitch analysis & scoring', nexus: true, pitchbook: false },
  { feature: 'AI-ranked investor matching with fit rationale', nexus: true, pitchbook: false },
  { feature: 'Market intelligence & trends', nexus: true, pitchbook: true },
  { feature: 'Mandate-aware investor profiles', nexus: true, pitchbook: true },
  { feature: 'Built for first-time founders', nexus: true, pitchbook: false },
  { feature: 'Plain-English explanations', nexus: true, pitchbook: false },
  { feature: 'Self-serve onboarding (no sales call)', nexus: true, pitchbook: false },
  { feature: 'Cancel anytime subscription flexibility', nexus: true, pitchbook: false },
]

export function ComparisonTable({ compact = false }: { compact?: boolean }) {
  const rows = compact ? comparisonRows.slice(0, 4) : comparisonRows

  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-6 md:p-8">
      <h2 className="mb-2 text-center text-xl font-bold md:text-2xl">NEXUS vs PitchBook</h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Compare practical fundraising outcomes, not just database access.
      </p>
      <div className="mx-auto max-w-2xl space-y-2">
        {rows.map((row) => (
          <div
            key={row.feature}
            className="grid grid-cols-[1fr_80px_80px] items-center gap-2 rounded-lg border border-border/40 px-4 py-3 text-sm"
          >
            <span className="font-medium text-foreground">{row.feature}</span>
            <span className="flex justify-center">
              {row.nexus ? (
                <CheckCircle className="h-5 w-5 text-primary" />
              ) : (
                <X className="h-5 w-5 text-muted-foreground/40" />
              )}
            </span>
            <span className="flex justify-center">
              {row.pitchbook ? (
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
              ) : (
                <X className="h-5 w-5 text-muted-foreground/40" />
              )}
            </span>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_80px_80px] items-center gap-2 rounded-lg border-2 border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <span className="font-bold text-foreground">Annual cost</span>
          <span className="text-center font-bold text-primary">$468/yr</span>
          <span className="text-center font-medium text-muted-foreground">$30,000+/yr</span>
        </div>
        <div className="grid grid-cols-[1fr_80px_80px] items-center gap-2 px-4 pt-1 text-xs text-muted-foreground">
          <span />
          <span className="text-center font-semibold text-foreground">NEXUS</span>
          <span className="text-center">PitchBook</span>
        </div>
      </div>
    </div>
  )
}

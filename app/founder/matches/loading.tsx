import { Skeleton } from '@/components/ui/skeleton'

export default function MatchesLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="page-shell-narrow">
        <div className="mb-6 space-y-1 md:mb-8">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-80" />
        </div>

        <Skeleton className="mb-6 h-10 w-64 rounded-xl" />

        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/40 p-5">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-72" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-14 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-10 w-16 shrink-0 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

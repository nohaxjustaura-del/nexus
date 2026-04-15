import { Skeleton } from '@/components/ui/skeleton'

export default function DiscoverLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="page-shell-narrow">
        <div className="mb-6 space-y-1 md:mb-8">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-5 w-64" />
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-9 w-40 rounded-xl" />
        </div>

        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>

        <Skeleton className="mb-3 h-4 w-24" />

        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

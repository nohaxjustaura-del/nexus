import { Skeleton } from '@/components/ui/skeleton'

export default function MatchesLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-96" />

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

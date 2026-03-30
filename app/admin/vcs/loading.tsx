import { Skeleton } from '@/components/ui/skeleton'

export default function AdminVcsLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-10 w-full max-w-md" />

      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

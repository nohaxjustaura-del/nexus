import { Skeleton } from '@/components/ui/skeleton'

export default function FounderSegmentLoading() {
  return (
    <div className="page-shell-narrow py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-44 md:h-10" />
        <Skeleton className="h-4 max-w-md" />
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    </div>
  )
}

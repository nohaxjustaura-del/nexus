import { Skeleton } from '@/components/ui/skeleton'

export default function AIAnalysisLoading() {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="page-shell-narrow">
        <div className="mx-auto w-full max-w-3xl pb-12">
          <div className="mb-8 border-b border-border/50 pb-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <Skeleton className="h-9 w-56" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="mt-3 h-4 w-80" />
          </div>

          <div className="mx-auto mb-8 flex justify-center">
            <Skeleton className="h-14 w-full max-w-xl rounded-full" />
          </div>

          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-12 w-48 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

import dynamic from 'next/dynamic'

const TrainingDataClient = dynamic(() => import('./training-data-client'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <span
        className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden
      />
      <span className="text-sm">Loading training data…</span>
    </div>
  ),
})

export default function TrainingDataPage() {
  return <TrainingDataClient />
}

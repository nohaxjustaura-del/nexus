import dynamic from 'next/dynamic'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'

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

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function TrainingDataPage() {
  const user = await getCurrentUser(false)
  if (!user || !isAdminEmail(user.email)) {
    redirect('/')
  }

  return <TrainingDataClient />
}

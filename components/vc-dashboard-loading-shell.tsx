import { Loading } from '@/components/ui/loading'

/** Consistent loader for /vc/dashboard (route loading + client fetch) so the shell does not flash between states. */
export function VCDashboardLoadingShell({
  text = 'Loading your dashboard…',
}: {
  text?: string
}) {
  return (
    <div className="bg-background">
      <div className="container mx-auto flex min-h-[min(72vh,calc(100vh-10rem))] max-w-7xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="animate-fade-in">
          <Loading size="lg" text={text} />
        </div>
      </div>
    </div>
  )
}

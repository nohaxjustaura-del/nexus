import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const nextActions = [
  'Review incoming founder mentorship requests',
  'Schedule your upcoming office-hour sessions',
  'Update your mentoring focus and availability',
] as const

export default function MentorDashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <Badge variant="secondary" className="mb-3">
            Mentor Workspace
          </Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">Mentor Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            This workspace is tailored for mentors. It keeps guidance workflows and founder support actions separate
            from founder-building and investor-sourcing experiences.
          </p>
        </header>

        <section className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
          <h2 className="text-lg font-medium text-foreground">Your next actions</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {nextActions.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/mentor/onboarding">
              <Button variant="outline">Update mentor profile</Button>
            </Link>
            <Link href="/account">
              <Button variant="ghost">Account settings</Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function MentorOnboardingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <header className="mb-8">
          <Badge variant="secondary" className="mb-3">
            Mentor Onboarding
          </Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Complete your mentor setup
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your domain expertise, mentoring preferences, and time availability so founders can connect with you
            in the right context.
          </p>
        </header>

        <section className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>1. Add your areas of expertise and industries.</li>
            <li>2. Set mentoring formats (office hours, async feedback, project advising).</li>
            <li>3. Share your weekly availability and preferred communication channels.</li>
          </ol>
          <div className="mt-6">
            <Button onClick={() => router.push('/mentor/dashboard')}>Continue to mentor dashboard</Button>
          </div>
        </section>
      </div>
    </div>
  )
}

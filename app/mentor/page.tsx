import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BRAND_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: 'Mentors',
  description: `${BRAND_NAME} mentor portal: discover founders you can support, track conversations, and guide startups with structured context.`,
}

export default function MentorLandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <Badge variant="secondary" className="mb-4">
          Mentor Portal
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Support founders with a dedicated mentor workspace
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Mentor accounts get a focused experience for guidance sessions, founder support requests, and curated
          learning resources without the investor or founder workflow clutter.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup?next=%2Fmentor%2Fonboarding">
            <Button>Become a mentor</Button>
          </Link>
          <Link href="/mentor/dashboard">
            <Button variant="outline">Open mentor dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

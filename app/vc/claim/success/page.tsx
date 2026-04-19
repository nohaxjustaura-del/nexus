import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function VCClaimSuccessPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-20">
        <div className="rounded-lg border bg-card p-10 text-center shadow-sm">
          <h1 className="mb-3 font-heading text-3xl font-bold tracking-tight">Thanks. Your investor application is under review.</h1>
          <p className="text-muted-foreground">
            We received your fund details. Our team will verify your profile and email you once it’s approved.
            This usually takes less than 24 hours.
          </p>
          <div className="mt-8 space-x-3">
            <Link href="/" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}



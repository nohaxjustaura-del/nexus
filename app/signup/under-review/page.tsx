export const dynamic = 'force-dynamic'

export default function UnderReviewPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-20">
        <div className="rounded-lg border bg-card p-10 text-center shadow-sm">
          <h1 className="mb-3 text-3xl font-bold">Your signup is under review</h1>
          <p className="text-muted-foreground">
            Thanks for applying to FounderMatch. We’re verifying your information and will email you
            as soon as your account is approved. While you wait, browsing is limited.
          </p>
          <div className="mt-8 space-x-3">
            <a href="/" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground">
              Go to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}



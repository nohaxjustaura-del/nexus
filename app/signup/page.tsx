import { Suspense } from 'react'
import { SignUpForm } from './signup-form'

function SignUpFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-md px-4 py-8 md:py-12">
        <div className="mx-auto mb-8 h-28 max-w-sm animate-pulse rounded-lg bg-muted/25" />
        <div className="h-80 animate-pulse rounded-xl border border-border/50 bg-muted/20" />
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpFallback />}>
      <SignUpForm />
    </Suspense>
  )
}

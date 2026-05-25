'use client'

import { lazy, Suspense } from 'react'

const LazySignUpForm = lazy(() =>
  import('./signup-form').then((mod) => ({ default: mod.SignUpForm }))
)

export function SignUpFormGate() {
  return (
    <Suspense fallback={null}>
      <LazySignUpForm />
    </Suspense>
  )
}

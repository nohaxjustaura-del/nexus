'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, Search } from 'lucide-react'

export function NotFoundClient() {
  return (
    <div className="relative flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center overflow-x-hidden px-4 text-center">
      <div className="mb-8">
        <h1 className="mb-4 text-9xl font-bold text-primary animate-bounce">404</h1>
        <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Page Not Found</h2>
        <p className="mx-auto mb-8 max-w-md text-lg text-muted-foreground">
          Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Link href="/">
          <Button size="lg" className="gap-2">
            <Home className="h-5 w-5" />
            Go Home
          </Button>
        </Link>
        <Button size="lg" variant="outline" onClick={() => window.history.back()} className="gap-2">
          <ArrowLeft className="h-5 w-5" />
          Go Back
        </Button>
        <Link href="/founder/discover">
          <Button size="lg" variant="outline" className="gap-2">
            <Search className="h-5 w-5" />
            Discover VCs
          </Button>
        </Link>
      </div>

      <div className="absolute left-10 top-1/4 -z-10 h-64 w-64 animate-pulse rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-10 -z-10 h-64 w-64 animate-pulse rounded-full bg-purple-500/5 blur-3xl" />
    </div>
  )
}

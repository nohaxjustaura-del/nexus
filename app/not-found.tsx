'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center px-4 text-center">
      <div className="mb-8">
        <h1 className="text-9xl font-bold text-primary mb-4 animate-bounce">404</h1>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
          Page Not Found
        </h2>
        <p className="text-lg text-slate-600 max-w-md mx-auto mb-8">
          Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/">
          <Button size="lg" className="gap-2">
            <Home className="h-5 w-5" />
            Go Home
          </Button>
        </Link>
        <Button 
          size="lg" 
          variant="outline" 
          onClick={() => window.history.back()}
          className="gap-2"
        >
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

      {/* Decorative elements */}
      <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-10 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -z-10 animate-pulse" />
    </div>
  )
}



'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Only log in development, and handle errors safely
    if (process.env.NODE_ENV === 'development') {
      try {
        console.error('Error boundary caught:', error?.message || error)
      } catch {
        // Silently fail if logging itself causes an error
      }
    }
  }, [error])

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="h-20 w-20 text-destructive mb-6 animate-bounce" />
      
      <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
        Something Went Wrong
      </h1>
      
      <p className="text-lg text-muted-foreground max-w-md mx-auto mb-8">
        We encountered an unexpected error. Don't worry, our team has been notified and we're working on it.
      </p>

      {process.env.NODE_ENV === 'development' && (
        <div className="mb-8 p-4 bg-muted rounded-lg text-left overflow-auto max-w-2xl w-full">
          <p className="text-sm font-mono text-foreground/85 break-words">
            {error.message}
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          size="lg" 
          onClick={reset}
          className="gap-2"
        >
          <RefreshCw className="h-5 w-5" />
          Try Again
        </Button>
        
        <Button 
          size="lg" 
          variant="outline"
          onClick={() => window.location.href = '/'}
          className="gap-2"
        >
          <Home className="h-5 w-5" />
          Go Home
        </Button>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-1/4 left-10 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-10 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -z-10 animate-pulse" />
    </div>
  )
}



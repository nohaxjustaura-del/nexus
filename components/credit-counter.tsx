'use client'

import { useState, useEffect, useRef } from 'react'
import { Coins, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  getUserCreditsClient,
  invalidateUserCreditsClientCache,
} from '@/lib/client/user-credits-client'

interface CreditCounterProps {
  className?: string
  showClaimButton?: boolean
  variant?: 'header' | 'badge'
}

export function CreditCounter({ 
  className, 
  showClaimButton = true,
  variant = 'header' 
}: CreditCounterProps) {
  const [credits, setCredits] = useState<number | null>(null)
  const [canClaim, setCanClaim] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const claimInFlight = useRef(false)

  useEffect(() => {
    setMounted(true)
    fetchCredits()
    fetchClaimStatus()
  }, [])

  const fetchCredits = async () => {
    try {
      const { ok, data } = await getUserCreditsClient()
      if (ok) {
        const n = typeof data.credits === 'number' ? data.credits : 0
        setCredits(n)
      } else {
        setCredits(0)
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error)
      setCredits(0)
    } finally {
      setLoading(false)
    }
  }

  const fetchClaimStatus = async () => {
    try {
      const res = await fetch('/api/claim-daily', {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        setCanClaim(data.canClaim ?? false)
      }
    } catch (error) {
      console.error('Failed to check claim status:', error)
    }
  }

  const handleClaim = async () => {
    if (claiming || claimInFlight.current) return
    claimInFlight.current = true
    setClaiming(true)
    try {
      const res = await fetch('/api/claim-daily', {
        method: 'POST',
        credentials: 'include'
      })
      const data = await res.json()
      
      if (data.success) {
        invalidateUserCreditsClientCache()
        setCredits(data.credits)
        setCanClaim(false)
        // Refresh both credits and claim status
        await Promise.all([fetchCredits(), fetchClaimStatus()])
      } else {
        // Update canClaim status even if already claimed
        setCanClaim(false)
        await fetchClaimStatus()
      }
    } catch (error) {
      console.error('Failed to claim daily credit:', error)
    } finally {
      claimInFlight.current = false
      setClaiming(false)
    }
  }

  // Format credits display - handle large numbers
  const formatCredits = (credits: number) => {
    if (credits >= Number.MAX_SAFE_INTEGER / 2) {
      return '∞'
    }
    if (credits >= 1000) {
      return `${(credits / 1000).toFixed(1)}k`
    }
    return credits.toString()
  }

  if (!mounted || loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-5 w-12 bg-slate-200 animate-pulse rounded" />
      </div>
    )
  }

  if (credits === null) {
    return null
  }

  if (variant === 'badge') {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/50 rounded-md border border-border/70">
          <Coins className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-foreground/85 text-xs">{formatCredits(credits)}</span>
        </div>
        {showClaimButton && canClaim && (
          <Button
            onClick={handleClaim}
            disabled={claiming}
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-400 hover:bg-emerald-500/10"
          >
            <Gift className="h-3 w-3 mr-1" />
            {claiming ? '...' : 'Claim'}
          </Button>
        )}
      </div>
    )
  }

  // Header variant (default)
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-br from-primary/10 to-primary/10 rounded-lg border border-primary/20">
        <Coins className="h-4 w-4 text-primary" />
        <span className="font-bold text-foreground text-sm">{formatCredits(credits)}</span>
        <span className="text-xs text-muted-foreground font-medium">credits</span>
      </div>
      {showClaimButton && canClaim && (
        <Button
          onClick={handleClaim}
          disabled={claiming}
          size="sm"
          className="h-8 px-3 text-xs font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-sm"
        >
          <Gift className="h-3.5 w-3.5 mr-1.5" />
          {claiming ? 'Claiming...' : 'Claim Daily'}
        </Button>
      )}
    </div>
  )
}


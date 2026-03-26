'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Gift, Check, Clock } from 'lucide-react'

export default function DailyClaim() {
  const [canClaim, setCanClaim] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [message, setMessage] = useState('')
  const [credits, setCredits] = useState(0)
  const [nextClaimTime, setNextClaimTime] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const claimInFlight = useRef(false)

  useEffect(() => {
    setMounted(true)
    checkClaimStatus()
  }, [])

  const checkClaimStatus = async () => {
    try {
      const res = await fetch('/api/claim-daily', { credentials: 'include' })
      const data = await res.json()
      
      if (res.ok) {
        setCanClaim(data.canClaim)
        setCredits(data.credits)
        setNextClaimTime(data.canClaimAgainAt)
      }
    } catch (error) {
      console.error('Failed to check claim status:', error)
    }
  }

  const handleClaim = async () => {
    if (!canClaim || claiming || claimInFlight.current) return
    claimInFlight.current = true
    setClaiming(true)
    setMessage('')

    try {
      const res = await fetch('/api/claim-daily', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()

      if (data.success) {
        setMessage('✨ Claimed 1 free credit!')
        setCanClaim(false)
        setCredits(data.credits)
        setNextClaimTime(data.canClaimAgainAt)
        
        // Refresh the page credits after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setMessage(data.message || 'Already claimed today')
        setCanClaim(false)
        setNextClaimTime(data.canClaimAgainAt)
      }
    } catch (error) {
      setMessage('Failed to claim. Please try again.')
    } finally {
      claimInFlight.current = false
      setClaiming(false)
    }
  }

  const getTimeUntilNextClaim = () => {
    if (!nextClaimTime) return null
    
    const now = new Date()
    const next = new Date(nextClaimTime)
    const diff = next.getTime() - now.getTime()
    
    if (diff <= 0) return 'Available now'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (!mounted) return null

  return (
    <Card className={`border-2 transition-all ${
      canClaim 
        ? 'border-emerald-300 bg-gradient-to-br from-emerald-500/10 to-primary/10 shadow-lg hover:shadow-xl' 
        : 'border-border bg-muted/50'
    }`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-3 rounded-lg ${
              canClaim 
                ? 'bg-gradient-to-br from-emerald-500 to-blue-500 text-white' 
                : 'bg-slate-200 text-slate-400'
            }`}>
              {canClaim ? (
                <Gift className="h-6 w-6" />
              ) : (
                <Check className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base text-foreground mb-1">
                Daily Free Credit
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {canClaim 
                  ? 'Claim your free credit today!' 
                  : 'You\'ve claimed your credit today'}
              </p>
              {!canClaim && nextClaimTime && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span>Next claim in {getTimeUntilNextClaim()}</span>
                </div>
              )}
              {message && (
                <p className={`text-sm font-semibold mt-2 ${
                  message.includes('✨') ? 'text-emerald-400' : 'text-muted-foreground'
                }`}>
                  {message}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={handleClaim}
            disabled={!canClaim || claiming}
            className={`shrink-0 font-semibold transition-all ${
              canClaim
                ? 'bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg hover:scale-105'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            size="sm"
          >
            {claiming ? (
              'Claiming...'
            ) : canClaim ? (
              <>
                <Gift className="mr-2 h-4 w-4" />
                Claim
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Claimed
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}





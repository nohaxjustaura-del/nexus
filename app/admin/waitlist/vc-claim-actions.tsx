'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { toast } from '@/components/ui/toast-simple'

export function VCClaimActions({ claimId }: { claimId: string }) {
  const router = useRouter()
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      const response = await fetch('/api/vc-claim/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ claimId }),
      })

      if (response.ok) {
        router.refresh()
      } else {
        toast.error('Failed to approve claim')
        setIsApproving(false)
      }
    } catch (error) {
      console.error('Error approving claim:', error)
      toast.error('Failed to approve claim')
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this claim?')) {
      return
    }

    setIsRejecting(true)
    try {
      const response = await fetch('/api/vc-claim/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ claimId }),
      })

      if (response.ok) {
        router.refresh()
      } else {
        toast.error('Failed to reject claim')
        setIsRejecting(false)
      }
    } catch (error) {
      console.error('Error rejecting claim:', error)
      toast.error('Failed to reject claim')
      setIsRejecting(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleApprove}
        disabled={isApproving || isRejecting}
        size="sm"
        className="bg-green-600 hover:bg-green-700"
      >
        {isApproving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="mr-2 h-4 w-4" />
        )}
        Approve
      </Button>
      <Button
        onClick={handleReject}
        disabled={isApproving || isRejecting}
        size="sm"
        variant="destructive"
      >
        {isRejecting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <XCircle className="mr-2 h-4 w-4" />
        )}
        Reject
      </Button>
    </div>
  )
}

















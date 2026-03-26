'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Building2, 
  Shield, 
  FileCheck, 
  CheckCircle, 
  XCircle, 
  Mail, 
  Clock,
  Loader2,
  CheckCircle2,
  ExternalLink
} from "lucide-react"
import Link from "next/link"

interface UserApproval {
  email: string
  status: string
  createdAt: string
  reviewedAt?: string
}

interface FounderVerification {
  email: string
  url?: string
  status: string
  submittedAt: string
}

interface VCClaim {
  id: string
  email: string
  name: string
  firmName: string
  idVerificationUrl?: string
  idVerified: boolean
  status: string
  createdAt: string | Date
}

interface UnverifiedVC {
  id: string
  email: string
  name: string
  firmName: string
  createdAt: string | Date
}

interface AdminDashboardClientProps {
  userApprovals: UserApproval[]
  founderVerifications: FounderVerification[]
  vcClaims: VCClaim[]
  unverifiedVCs: UnverifiedVC[]
}

export function AdminDashboardClient({
  userApprovals,
  founderVerifications,
  vcClaims,
  unverifiedVCs,
}: AdminDashboardClientProps) {
  const router = useRouter()
  const [processing, setProcessing] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const setProcessingState = (id: string, isProcessing: boolean) => {
    setProcessing(prev => {
      const next = new Set(prev)
      if (isProcessing) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  // Approve user signup
  const approveUserSignup = async (email: string) => {
    setProcessingState(`user-${email}`, true)
    try {
      const res = await fetch(`/api/admin/users/approve/${encodeURIComponent(email)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('Failed to approve')
      router.refresh()
    } catch (error) {
      alert('Failed to approve user signup')
      setProcessingState(`user-${email}`, false)
    }
  }

  // Approve founder verification
  const approveFounderVerification = async (email: string) => {
    setProcessingState(`founder-${email}`, true)
    try {
      // Approve verification
      const res1 = await fetch(`/api/admin/founders/verification/${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      if (!res1.ok) throw new Error('Failed to approve verification')
      
      // Also approve user access
      const res2 = await fetch(`/api/admin/users/approve/${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res2.ok) console.warn('Failed to approve user access')
      
      router.refresh()
    } catch (error) {
      alert('Failed to approve founder verification')
      setProcessingState(`founder-${email}`, false)
    }
  }

  // Approve VC claim
  const approveVCClaim = async (claimId: string) => {
    setProcessingState(`vcclaim-${claimId}`, true)
    try {
      const res = await fetch('/api/vc-claim/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId }),
      })
      if (!res.ok) throw new Error('Failed to approve')
      router.refresh()
    } catch (error) {
      alert('Failed to approve VC claim')
      setProcessingState(`vcclaim-${claimId}`, false)
    }
  }

  // Verify VC
  const verifyVC = async (vcId: string) => {
    setProcessingState(`vc-${vcId}`, true)
    try {
      const res = await fetch(`/api/admin/vcs/${vcId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: true }),
      })
      if (!res.ok) throw new Error('Failed to verify VC')
      router.refresh()
    } catch (error) {
      alert('Failed to verify VC')
      setProcessingState(`vc-${vcId}`, false)
    }
  }

  // Bulk approve user signups
  const bulkApproveUserSignups = async () => {
    if (!confirm(`Approve all ${userApprovals.length} user signups?`)) return
    
    setProcessingState('bulk-users', true)
    try {
      await Promise.all(
        userApprovals.map(approval =>
          fetch(`/api/admin/users/approve/${encodeURIComponent(approval.email)}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      )
      router.refresh()
    } catch (error) {
      alert('Failed to bulk approve')
      setProcessingState('bulk-users', false)
    }
  }

  return (
    <div className="space-y-6">
      {/* User Signups */}
      {userApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Signups ({userApprovals.length})
                </CardTitle>
                <CardDescription>Pending account approvals</CardDescription>
              </div>
              <Button
                onClick={bulkApproveUserSignups}
                disabled={processing.has('bulk-users')}
                size="sm"
                variant="outline"
              >
                {processing.has('bulk-users') ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Approve All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userApprovals.map((approval) => {
                const id = `user-${approval.email}`
                const isProcessing = processing.has(id)
                return (
                  <div
                    key={approval.email}
                    className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50/50 p-4 hover:bg-yellow-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-yellow-600" />
                      <div>
                        <div className="font-medium">{approval.email}</div>
                        <div className="text-xs text-muted-foreground">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {approval.createdAt ? (mounted ? new Date(approval.createdAt).toLocaleString() : new Date(approval.createdAt).toISOString().slice(0, 10)) : 'Unknown'}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => approveUserSignup(approval.email)}
                      disabled={isProcessing}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Approve
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Founder Verifications */}
      {founderVerifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Founder ID Verifications ({founderVerifications.length})
            </CardTitle>
            <CardDescription>Identity verification submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {founderVerifications.map((verification) => {
                const id = `founder-${verification.email}`
                const isProcessing = processing.has(id)
                return (
                  <div
                    key={verification.email}
                    className="flex items-center justify-between rounded-lg border border-primary/25 bg-primary/12 p-4 hover:bg-primary/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileCheck className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{verification.email}</div>
                        <div className="text-xs text-muted-foreground">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {verification.submittedAt ? (mounted ? new Date(verification.submittedAt).toLocaleString() : new Date(verification.submittedAt).toISOString().slice(0, 10)) : 'Unknown'}
                          {verification.url && (
                            <a
                              href={`/api/admin/founders/verification/file/${encodeURIComponent(verification.email)}`}
                              target="_blank"
                              className="ml-2 text-blue-600 hover:underline"
                            >
                              View file
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => approveFounderVerification(verification.email)}
                      disabled={isProcessing}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Approve
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* VC Claims */}
      {vcClaims.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              VC Profile Claims ({vcClaims.length})
            </CardTitle>
            <CardDescription>VCs claiming their profiles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vcClaims.map((claim) => {
                const id = `vcclaim-${claim.id}`
                const isProcessing = processing.has(id)
                return (
                  <div
                    key={claim.id}
                    className="flex items-center justify-between rounded-lg border border-purple-500/30 bg-purple-500/10/50 p-4 hover:bg-purple-500/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium">{claim.firmName}</div>
                        <div className="text-sm text-muted-foreground">
                          {claim.name} • {claim.email}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" />
                          {mounted ? new Date(claim.createdAt).toLocaleString() : new Date(claim.createdAt).toISOString().slice(0, 10)}
                          {claim.idVerified && (
                            <Badge variant="secondary" className="ml-2">
                              ID Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => approveVCClaim(claim.id)}
                      disabled={isProcessing}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Approve
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unverified VCs */}
      {unverifiedVCs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Unverified VCs ({unverifiedVCs.length})
            </CardTitle>
            <CardDescription>VC profiles not yet verified</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unverifiedVCs.map((vc) => {
                const id = `vc-${vc.id}`
                const isProcessing = processing.has(id)
                return (
                  <div
                    key={vc.id}
                    className="flex items-center justify-between rounded-lg border border-orange-500/30 bg-orange-500/10 p-4 hover:bg-orange-500/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-orange-600" />
                      <div>
                        <div className="font-medium">{vc.firmName}</div>
                        <div className="text-sm text-muted-foreground">
                          {vc.name} • {vc.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <Clock className="mr-1 inline h-3 w-3" />
                          Joined {mounted ? new Date(vc.createdAt).toLocaleDateString() : new Date(vc.createdAt).toISOString().slice(0, 10)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/vcs`}>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </Link>
                      <Button
                        onClick={() => verifyVC(vc.id)}
                        disabled={isProcessing}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isProcessing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        Verify
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


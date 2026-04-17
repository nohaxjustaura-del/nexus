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
  CheckCircle, 
  XCircle, 
  Mail, 
  Clock,
  Loader2,
  CheckCircle2,
  ExternalLink,
  UserX,
  ShieldOff,
} from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from '@/components/ui/toast-simple'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface UserApproval {
  email: string
  status: string
  createdAt: string
  reviewedAt?: string
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
  vcClaims: VCClaim[]
  unverifiedVCs: UnverifiedVC[]
}

export function AdminDashboardClient({
  userApprovals,
  vcClaims,
  unverifiedVCs,
}: AdminDashboardClientProps) {
  const router = useRouter()
  const [processing, setProcessing] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  const [revokeEmail, setRevokeEmail] = useState('')
  const [revokeBusy, setRevokeBusy] = useState<'access' | 'verification' | null>(null)

  const hasPending =
    userApprovals.length +
      vcClaims.length +
      unverifiedVCs.length >
    0

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

  const patchUserAction = async (email: string, action: 'reject_signup' | 'revoke_access' | 'revoke_verification') => {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Request failed')
    return data
  }

  // Decline pending signup (queue only)
  const rejectUserSignup = async (email: string) => {
    if (!confirm(`Reject signup for ${email}? They will receive a rejection email.`)) return
    setProcessingState(`reject-${email}`, true)
    try {
      await patchUserAction(email, 'reject_signup')
      toast.success('Signup rejected')
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Reject failed')
    } finally {
      setProcessingState(`reject-${email}`, false)
    }
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
      toast.error('Failed to approve user signup')
      setProcessingState(`user-${email}`, false)
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
      toast.error('Failed to approve investor claim')
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
      if (!res.ok) throw new Error('Failed to verify investor')
      router.refresh()
    } catch (error) {
      toast.error('Failed to verify investor')
      setProcessingState(`vc-${vcId}`, false)
    }
  }

  const runRevokeAccess = async () => {
    const email = revokeEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      toast.error('Enter a valid email')
      return
    }
    if (
      !confirm(
        `Revoke access for ${email}? This marks their signup as rejected and removes founder ID verification if present. They will receive a rejection email.`
      )
    ) {
      return
    }
    setRevokeBusy('access')
    try {
      await patchUserAction(email, 'revoke_access')
      toast.success('Access revoked')
      setRevokeEmail('')
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Revoke failed')
    } finally {
      setRevokeBusy(null)
    }
  }

  const runRevokeVerification = async () => {
    const email = revokeEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      toast.error('Enter a valid email')
      return
    }
    if (
      !confirm(
        `Revoke founder ID verification for ${email}? Signup approval status is unchanged; they may still have access if already approved another way.`
      )
    ) {
      return
    }
    setRevokeBusy('verification')
    try {
      const data = await patchUserAction(email, 'revoke_verification')
      if (data?.skipped) {
        toast.success('No founder verification on file; nothing to revoke.')
      } else {
        toast.success('Founder verification revoked')
      }
      setRevokeEmail('')
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Revoke failed')
    } finally {
      setRevokeBusy(null)
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
      toast.error('Failed to bulk approve')
      setProcessingState('bulk-users', false)
    }
  }

  return (
    <div className="space-y-6">
      <Accordion type="single" collapsible className="rounded-lg border border-border/60 bg-card/40">
        <AccordionItem value="admin-guide" className="border-0 px-4">
          <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
            How this dashboard works
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc space-y-1.5 pb-3 pl-5 text-sm text-muted-foreground">
              <li>Approve or reject pending signups before users get full access.</li>
              <li>Review founder ID uploads, then verify or reject from the panel.</li>
              <li>Process investor profile claims and verify new investor records from the lists below.</li>
              <li>
                Use <span className="font-medium text-foreground">Revoke by email</span> only when someone is not on these
                queues. See expanded notes on that card.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {!hasPending && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
            <h3 className="mb-2 text-xl font-semibold">Nothing pending</h3>
            <p className="text-center text-muted-foreground">
              New requests will show up here.
            </p>
          </CardContent>
        </Card>
      )}

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
                const rejectId = `reject-${approval.email}`
                const isProcessing = processing.has(id)
                const isRejecting = processing.has(rejectId)
                return (
                  <div
                    key={approval.email}
                    className="flex flex-col gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-4 transition-colors hover:bg-amber-500/[0.09] dark:border-amber-400/15 dark:bg-amber-950/30 dark:hover:bg-amber-950/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 shrink-0 text-amber-700/90 dark:text-amber-400/70" />
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{approval.email}</div>
                        <div className="text-xs text-foreground/60 dark:text-foreground/55 mt-0.5 flex items-center gap-1">
                          <Clock className="inline h-3 w-3 shrink-0 opacity-80" aria-hidden />
                          <span>
                            {approval.createdAt
                              ? mounted
                                ? new Date(approval.createdAt).toLocaleString()
                                : new Date(approval.createdAt).toISOString().slice(0, 10)
                              : 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <Button
                        onClick={() => rejectUserSignup(approval.email)}
                        disabled={isProcessing || isRejecting}
                        size="sm"
                        variant="outline"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      >
                        {isRejecting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        Reject
                      </Button>
                      <Button
                        onClick={() => approveUserSignup(approval.email)}
                        disabled={isProcessing || isRejecting}
                        size="sm"
                        className="bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                      >
                        {isProcessing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                    </div>
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
              Investor Profile Claims ({vcClaims.length})
            </CardTitle>
            <CardDescription>Investors claiming their profiles</CardDescription>
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
              Unverified Investors ({unverifiedVCs.length})
            </CardTitle>
            <CardDescription>Investor profiles not yet verified</CardDescription>
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

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserX className="h-4 w-4" />
            Revoke by email
          </CardTitle>
        </CardHeader>
        <Accordion type="single" collapsible className="border-t border-border/40 px-6">
          <AccordionItem value="revoke-notes" className="border-0">
            <AccordionTrigger className="py-3 text-sm text-muted-foreground hover:no-underline">
              When to use revoke actions
            </AccordionTrigger>
            <AccordionContent>
              <p className="max-w-prose pb-3 text-sm leading-relaxed text-muted-foreground">
                For accounts that are already approved or not on the queues above: remove access (signup + founder ID) or
                revoke founder ID verification only. Revoke access sends a rejection email and clears founder ID if present;
                revoke verification leaves signup status unchanged.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-revoke-email">Email</Label>
            <Input
              id="admin-revoke-email"
              type="email"
              autoComplete="email"
              placeholder="user@example.com"
              value={revokeEmail}
              onChange={(e) => setRevokeEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={revokeBusy !== null}
              onClick={runRevokeAccess}
            >
              {revokeBusy === 'access' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserX className="mr-2 h-4 w-4" />
              )}
              Revoke access
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={revokeBusy !== null}
              onClick={runRevokeVerification}
            >
              {revokeBusy === 'verification' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldOff className="mr-2 h-4 w-4" />
              )}
              Revoke verification
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}







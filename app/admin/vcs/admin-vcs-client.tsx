'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  Globe,
  Linkedin,
  Download,
  Eye,
  EyeOff,
  AlertTriangle,
  ChevronDown,
} from "lucide-react"
import { parseStringArray } from "@/lib/utils"
import { toast } from '@/components/ui/toast-simple'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

type VcLinkIssue = { field: 'websiteUrl' | 'linkedinUrl' | 'applicationUrl'; message: string }

export interface AdminVcInvestorClient {
  id: string
  email: string
  name: string
  firmName: string
  verified: boolean
  stages: string
  sectors: string
  checkMin: number
  checkMax: number
  geoFocus: string
  applicationUrl: string | null
  linkedinUrl: string | null
  websiteUrl: string | null
  createdAt: string
  updatedAt: string
  linkQuality?: {
    safeWebsite: string | null
    safeLinkedin: string | null
    safeApplication: string | null
    issues: VcLinkIssue[]
    linkClean: boolean
  }
}

export interface AdminVcClaimClient {
  id: string
  email: string
  name: string
  firmName: string
  status: string
  idVerificationUrl: string | null
  idVerified: boolean
  createdAt: string
  updatedAt: string
}

export function AdminVcsClient({
  initialInvestors,
  initialClaims,
  loadError,
}: {
  initialInvestors: AdminVcInvestorClient[]
  initialClaims: AdminVcClaimClient[]
  loadError: string | null
}) {
  const [investors, setInvestors] = useState<AdminVcInvestorClient[]>(initialInvestors)
  const [claims, setClaims] = useState<AdminVcClaimClient[]>(initialClaims)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'verified' | 'unverified' | 'needs_attention'
  >('all')
  const [showPendingClaims, setShowPendingClaims] = useState(true)

  const loadData = async () => {
    try {
      const [investorsRes, claimsRes] = await Promise.all([
        fetch('/api/admin/vcs', { credentials: 'same-origin' }),
        fetch('/api/admin/vc-claims', { credentials: 'same-origin' }),
      ])

      if (!investorsRes.ok || !claimsRes.ok) {
        toast.error('Failed to refresh VC data')
        return
      }

      const investorsData = await investorsRes.json()
      const claimsData = await claimsRes.json()

      setInvestors(investorsData.investors || [])
      setClaims(claimsData.claims || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error refreshing VC data')
    }
  }

  const handleApprove = async (claimId: string) => {
    try {
      const res = await fetch(`/api/vc-claim/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId }),
      })

      if (res.ok) {
        await loadData()
      } else {
        toast.error('Failed to approve VC claim')
      }
    } catch (error) {
      console.error('Error approving claim:', error)
      toast.error('Error approving claim')
    }
  }

  const handleReject = async (claimId: string, notes?: string) => {
    const rejectionNotes = notes || prompt('Rejection reason (optional):') || undefined
    if (rejectionNotes === null) return

    try {
      const res = await fetch(`/api/vc-claim/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, notes: rejectionNotes }),
      })

      if (res.ok) {
        await loadData()
      } else {
        toast.error('Failed to reject VC claim')
      }
    } catch (error) {
      console.error('Error rejecting claim:', error)
      toast.error('Error rejecting claim')
    }
  }

  const handleToggleVerification = async (investorId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/vcs/${investorId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: !currentStatus }),
      })

      if (res.ok) {
        await loadData()
      } else {
        toast.error('Failed to update verification status')
      }
    } catch (error) {
      console.error('Error toggling verification:', error)
      toast.error('Error updating verification')
    }
  }

  const handleDelete = async (investorId: string) => {
    const confirmDelete = confirm('Delete this VC? This action cannot be undone.')
    if (!confirmDelete) return

    try {
      const res = await fetch(`/api/admin/vcs/${investorId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await loadData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to delete VC')
      }
    } catch (error) {
      console.error('Error deleting VC:', error)
      toast.error('Error deleting VC')
    }
  }

  const q = searchTerm.toLowerCase()
  const filteredInvestors = investors.filter((inv) => {
    const firm = (inv.firmName ?? '').toLowerCase()
    const person = (inv.name ?? '').toLowerCase()
    const email = (inv.email ?? '').toLowerCase()
    const matchesSearch = firm.includes(q) || person.includes(q) || email.includes(q)

    const linkClean = inv.linkQuality?.linkClean ?? true
    const needsAttention = !inv.verified || !linkClean

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'verified' && inv.verified) ||
      (filterStatus === 'unverified' && !inv.verified) ||
      (filterStatus === 'needs_attention' && needsAttention)

    return matchesSearch && matchesFilter
  })

  const pendingClaims = claims.filter((c) => c.status === 'pending')
  const needsAttentionCount = investors.filter((i) => {
    const clean = i.linkQuality?.linkClean ?? true
    return !i.verified || !clean
  }).length

  const stats = {
    total: investors.length,
    verified: investors.filter((i) => i.verified).length,
    unverified: investors.filter((i) => !i.verified).length,
    pendingClaims: pendingClaims.length,
    needsAttention: needsAttentionCount,
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            VC management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Approve claims and manage investor profiles
          </p>
        </div>

        {loadError && (
          <div
            className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {loadError}
          </div>
        )}

        <Accordion type="single" collapsible className="mb-6 rounded-lg border border-border/60 bg-card/50">
          <AccordionItem value="vc-admin-tips" className="border-0 px-4">
            <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
              VC admin tips
            </AccordionTrigger>
            <AccordionContent>
              <ul className="list-disc space-y-1.5 pb-3 pl-5 text-sm text-muted-foreground">
                <li>Use search and filters to narrow the list; export CSV for offline review.</li>
                <li>
                  <span className="font-medium text-foreground">Needs attention</span> flags unverified profiles or broken
                  links from automated checks.
                </li>
                <li>Approve claims only after ID verification looks legitimate; reject with a short internal note.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total VCs</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Verified</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Unverified</CardTitle>
              <XCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.unverified}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.pendingClaims}</div>
            </CardContent>
          </Card>

          <Card className={stats.needsAttention > 0 ? 'border-amber-500/50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Needs attention</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.needsAttention}</div>
              <p className="text-xs text-muted-foreground mt-1">Unverified or link issues</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Claims Section */}
        {showPendingClaims && pendingClaims.length > 0 && (
          <Card className="mb-8 border-primary/25">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Pending VC Claims ({pendingClaims.length})
                  </CardTitle>
                  <CardDescription>
                    Review and approve new VC profile claims
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPendingClaims(false)}
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold">{claim.firmName}</h3>
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          Pending
                        </Badge>
                        {claim.idVerified && (
                          <Badge variant="secondary" className="text-green-700">
                            ID verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        <strong>{claim.name}</strong> • {claim.email}
                      </p>
                      {claim.idVerificationUrl?.trim() ? (
                        <p className="mt-2">
                          <a
                            href={claim.idVerificationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View verification upload
                          </a>
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground mt-2">
                        Submitted {new Date(claim.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(claim.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(claim.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!showPendingClaims && pendingClaims.length > 0 && (
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={() => setShowPendingClaims(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Show Pending Claims ({pendingClaims.length})
            </Button>
          </div>
        )}

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by firm name, contact name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open('/api/admin/vcs/export-csv', '_blank')
                  }}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('all')}
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === 'verified' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('verified')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Verified
                </Button>
                <Button
                  variant={filterStatus === 'unverified' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('unverified')}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Unverified
                </Button>
                <Button
                  variant={filterStatus === 'needs_attention' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('needs_attention')}
                  className="gap-1"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Needs attention
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VC List */}
        <div className="space-y-4">
          {filteredInvestors.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No VCs found matching your criteria.
              </CardContent>
            </Card>
          ) : (
            filteredInvestors.map((investor) => (
              <Card key={investor.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{investor.firmName}</h3>
                        {investor.verified ? (
                          <Badge className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            <XCircle className="h-3 w-3 mr-1" />
                            Unverified
                          </Badge>
                        )}
                        {(investor.linkQuality?.issues.length ?? 0) > 0 && (
                          <Badge variant="outline" className="text-amber-700 border-amber-600">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Link issues ({investor.linkQuality!.issues.length})
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        <strong>{investor.name}</strong> • {investor.email}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge variant="secondary">
                          ${investor.checkMin}K - ${investor.checkMax}K
                        </Badge>
                        {parseStringArray(investor.stages).map((stage) => (
                          <Badge key={stage} variant="secondary">{stage}</Badge>
                        ))}
                        {(() => {
                          const sectors = parseStringArray(investor.sectors)
                          const head = sectors.slice(0, 3)
                          const tail = sectors.slice(3)
                          return (
                            <>
                              {head.map((sector) => (
                                <Badge key={sector} variant="outline">{sector}</Badge>
                              ))}
                              {tail.length > 0 ? (
                                <Collapsible className="group/sec-more inline-flex items-center">
                                  <CollapsibleTrigger className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-muted/50">
                                    +{tail.length} sectors
                                    <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/sec-more:rotate-180" aria-hidden />
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <span className="mt-1 flex flex-wrap gap-2">
                                      {tail.map((sector) => (
                                        <Badge key={sector} variant="outline">{sector}</Badge>
                                      ))}
                                    </span>
                                  </CollapsibleContent>
                                </Collapsible>
                              ) : null}
                            </>
                          )
                        })()}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
                        {investor.linkQuality?.safeWebsite ? (
                          <a
                            href={investor.linkQuality.safeWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                          >
                            <Globe className="h-4 w-4" />
                            Website
                          </a>
                        ) : investor.websiteUrl?.trim() ? (
                          <span className="flex items-center gap-1 text-sm text-destructive" title={investor.websiteUrl}>
                            <Globe className="h-4 w-4" />
                            Website (broken URL)
                          </span>
                        ) : null}
                        {investor.linkQuality?.safeLinkedin ? (
                          <a
                            href={investor.linkQuality.safeLinkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                          >
                            <Linkedin className="h-4 w-4" />
                            LinkedIn
                          </a>
                        ) : investor.linkedinUrl?.trim() ? (
                          <span className="flex items-center gap-1 text-sm text-destructive" title={investor.linkedinUrl}>
                            <Linkedin className="h-4 w-4" />
                            LinkedIn (broken URL)
                          </span>
                        ) : null}
                        {investor.linkQuality?.safeApplication ? (
                          <a
                            href={investor.linkQuality.safeApplication}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Apply
                          </a>
                        ) : investor.applicationUrl?.trim() ? (
                          <span className="flex items-center gap-1 text-sm text-destructive" title={investor.applicationUrl}>
                            <ExternalLink className="h-4 w-4" />
                            Apply (broken URL)
                          </span>
                        ) : null}
                      </div>
                      {(investor.linkQuality?.issues.length ?? 0) > 0 && (
                        <ul className="mt-2 text-xs text-amber-800 dark:text-amber-200/90 list-disc pl-4 space-y-0.5">
                          {investor.linkQuality!.issues.map((issue, idx) => (
                            <li key={idx}>
                              <span className="font-medium">{issue.field}:</span> {issue.message}
                            </li>
                          ))}
                        </ul>
                      )}

                      <p className="text-xs text-muted-foreground mt-3">
                        Created {new Date(investor.createdAt).toLocaleDateString()} •
                        Updated {new Date(investor.updatedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        size="sm"
                        variant={investor.verified ? "outline" : "default"}
                        onClick={() => handleToggleVerification(investor.id, investor.verified)}
                      >
                        {investor.verified ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" />
                            Unverify
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verify
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(investor.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

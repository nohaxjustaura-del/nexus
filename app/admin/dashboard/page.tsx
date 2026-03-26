import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminDashboardClient } from "./admin-dashboard-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Building2, Shield, FileCheck, CheckCircle2, Clock } from "lucide-react"
import { isAdminEmail } from "@/lib/constants"
import {
  enrichFounderVerifications,
  serializeFounderVerificationRows,
} from "@/lib/admin/founder-verifications"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AdminDashboardPage() {
  // Check admin access
  const user = await getCurrentUser(false)
  if (!user || !isAdminEmail(user.email)) {
    redirect('/')
  }

  // Fetch all pending items in parallel
  const [
    userApprovals,
    founderVerificationPending,
    vcClaims,
    unverifiedVCs
  ] = await Promise.all([
    (async () => {
      try {
        return await db.userApproval.findMany({
          where: { status: 'pending' },
          orderBy: { createdAt: 'desc' },
        })
      } catch (error) {
        console.error('Error loading user approvals:', error)
        return []
      }
    })(),

    (async () => {
      try {
        const rows = await db.founderVerification.findMany({
          where: { status: 'pending' },
          orderBy: { submittedAt: 'desc' },
        })
        const enriched = await enrichFounderVerifications(rows)
        return serializeFounderVerificationRows(enriched)
      } catch (error) {
        console.error('Error loading founder verifications:', error)
        return []
      }
    })(),
    
    // Pending VC claims
    db.vCClaim.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    
    // Unverified VCs
    db.investor.findMany({
      where: { verified: false },
      select: {
        id: true,
        email: true,
        name: true,
        firmName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ])

  // Calculate statistics
  const stats = {
    userSignups: userApprovals.length,
    founderVerifications: founderVerificationPending.length,
    vcClaims: vcClaims.length,
    unverifiedVCs: unverifiedVCs.length,
    total: userApprovals.length + founderVerificationPending.length + vcClaims.length + unverifiedVCs.length,
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            {stats.total > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                <Clock className="h-4 w-4" />
                {stats.total} Pending
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin/approvals" className="text-sm text-muted-foreground hover:text-foreground">
              User Approvals
            </a>
            <a href="/admin/founders" className="text-sm text-muted-foreground hover:text-foreground">
              Founder IDs
            </a>
            <a href="/admin/vcs" className="text-sm text-muted-foreground hover:text-foreground">
              VCs
            </a>
            <a href="/admin/training-data" className="text-sm text-muted-foreground hover:text-foreground">
              Training Data
            </a>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">User Signups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.userSignups}</div>
              <p className="text-xs text-muted-foreground">Pending approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Founder Verifications</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.founderVerifications}</div>
              <p className="text-xs text-muted-foreground">ID verification pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">VC Claims</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.vcClaims}</div>
              <p className="text-xs text-muted-foreground">Profile claims pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Unverified VCs</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unverifiedVCs}</div>
              <p className="text-xs text-muted-foreground">Not yet verified</p>
            </CardContent>
          </Card>
        </div>

        {/* All Pending Items */}
        {stats.total > 0 ? (
          <AdminDashboardClient
            userApprovals={userApprovals.map((u) => ({
              email: u.email,
              status: u.status,
              createdAt: u.createdAt.toISOString(),
              reviewedAt: u.reviewedAt?.toISOString(),
            }))}
            founderVerificationPending={founderVerificationPending}
            vcClaims={vcClaims.map(c => ({
              ...c,
              createdAt: c.createdAt.toISOString(),
              idVerificationUrl: c.idVerificationUrl ?? undefined,
            }))}
            unverifiedVCs={unverifiedVCs.map(vc => ({
              ...vc,
              createdAt: vc.createdAt.toISOString(),
            }))}
          />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
              <h3 className="mb-2 text-xl font-semibold">All Clear!</h3>
              <p className="text-muted-foreground">No pending approvals at this time.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


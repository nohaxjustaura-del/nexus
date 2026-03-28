import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminDashboardClient } from "./admin-dashboard-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DashboardIconBuilding2,
  DashboardIconClock,
  DashboardIconFileCheck,
  DashboardIconShield,
  DashboardIconUsers,
} from "./dashboard-stat-icons"
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
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Admin
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Approve signups and claims from this page. Use the top tabs for lists and details.
            </p>
          </div>
          {stats.total > 0 && (
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-destructive/35 bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive">
              <DashboardIconClock className="h-4 w-4 shrink-0" />
              {stats.total} pending
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">User Signups</CardTitle>
              <DashboardIconUsers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.userSignups}</div>
              <p className="text-xs text-muted-foreground">Pending approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Founder Verifications</CardTitle>
              <DashboardIconFileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.founderVerifications}</div>
              <p className="text-xs text-muted-foreground">ID verification pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">VC Claims</CardTitle>
              <DashboardIconBuilding2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.vcClaims}</div>
              <p className="text-xs text-muted-foreground">Profile claims pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Unverified VCs</CardTitle>
              <DashboardIconShield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unverifiedVCs}</div>
              <p className="text-xs text-muted-foreground">Not yet verified</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending queues + revoke tools */}
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
      </div>
    </div>
  )
}


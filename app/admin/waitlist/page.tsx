import { db } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Heart,
  Users,
  TrendingUp,
  Calendar,
  Mail,
  Building2,
  CheckCircle,
  XCircle,
  ExternalLink
} from "lucide-react"
import Link from "next/link"
import { parseJSON } from "@/lib/utils"
import { VCClaimActions } from "./vc-claim-actions"

export const dynamic = 'force-dynamic'

export default async function AdminWaitlistPage() {
  const signups = await db.waitlist.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const vcClaims = await db.vCClaim.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const stats = {
    total: signups.length,
    today: signups.filter(s => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return s.createdAt >= today
    }).length,
    thisWeek: signups.filter(s => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return s.createdAt >= weekAgo
    }).length,
  }

  const bySource = signups.reduce((acc, s) => {
    const source = s.source || 'unknown'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">NEXUS Admin</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/admin/vcs">
              <Button variant="ghost" size="sm">
                <Building2 className="h-4 w-4 mr-2" />
                VC Management
              </Button>
            </Link>
            <Badge variant="secondary">Waitlist Dashboard</Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Waitlist Signups</h1>
          <p className="text-muted-foreground">
            All emails will be notified at: <strong>adventa.counseling@gmail.com</strong>
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                All time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisWeek}</div>
              <p className="text-xs text-muted-foreground">
                Last 7 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
              <p className="text-xs text-muted-foreground">
                Since midnight
              </p>
            </CardContent>
          </Card>
        </div>

        {/* By Source */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Signups by Source</CardTitle>
            <CardDescription>Where people are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(bySource).map(([source, count]) => (
                <Badge key={source} variant="secondary" className="text-sm">
                  {source}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Signups */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Signups</CardTitle>
            <CardDescription>Latest {Math.min(100, signups.length)} signups</CardDescription>
          </CardHeader>
          <CardContent>
            {signups.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Mail className="mx-auto mb-4 h-12 w-12" />
                <p>No signups yet. Share your landing page to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {signups.map((signup) => (
                  <div
                    key={signup.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{signup.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(signup.createdAt).toLocaleString()} · 
                          {' '}
                          {signup.source || 'unknown'} · 
                          {' '}
                          {signup.userType || 'founder'}
                        </div>
                      </div>
                    </div>
                    {signup.notified && (
                      <Badge variant="outline" className="text-xs">
                        Notified
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* VC Claims Section */}
        <div className="mt-12">
          <div className="mb-6">
            <h2 className="mb-2 text-2xl font-bold">VC Profile Claims</h2>
            <p className="text-muted-foreground">
              Review and approve VC profile claim requests
            </p>
          </div>

          {/* VC Claims Stats */}
          <div className="mb-8 grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {vcClaims.filter((c: { status: string }) => c.status === 'pending').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting review
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {vcClaims.filter((c: { status: string }) => c.status === 'approved').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total approved
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vcClaims.length}</div>
                <p className="text-xs text-muted-foreground">
                  All time
                </p>
              </CardContent>
            </Card>
          </div>

          {/* VC Claims List */}
          <Card>
            <CardHeader>
              <CardTitle>VC Claim Requests</CardTitle>
              <CardDescription>
                {vcClaims.filter((c: { status: string }) => c.status === 'pending').length > 0 
                  ? `${vcClaims.filter((c: { status: string }) => c.status === 'pending').length} pending review`
                  : 'No pending claims'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vcClaims.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Building2 className="mx-auto mb-4 h-12 w-12" />
                  <p>No VC claim requests yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vcClaims.map((claim) => {
                    return (
                      <div
                        key={claim.id}
                        className={`rounded-lg border p-6 ${
                          claim.status === 'pending' 
                            ? 'border-yellow-500 bg-yellow-50/50' 
                            : claim.status === 'approved'
                            ? 'border-green-500 bg-emerald-500/10'
                            : 'border-red-500 bg-red-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-2 flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{claim.firmName}</h3>
                              <Badge 
                                variant={
                                  claim.status === 'approved' ? 'default' :
                                  claim.status === 'rejected' ? 'destructive' :
                                  'secondary'
                                }
                              >
                                {claim.status}
                              </Badge>
                            </div>
                            <div className="mb-4 space-y-1 text-sm text-muted-foreground">
                              <div><strong>Name:</strong> {claim.name}</div>
                              <div><strong>Email:</strong> {claim.email}</div>
                              {claim.idVerified && (
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-green-600">ID Verified</span>
                                </div>
                              )}
                              <div className="text-xs">
                                <strong>Submitted:</strong> {new Date(claim.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          {claim.status === 'pending' && (
                            <VCClaimActions claimId={claim.id} />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Export */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Pro tip:</strong> Run <code className="rounded bg-muted px-2 py-1">npx prisma studio</code> to export emails as CSV
          </p>
        </div>
      </div>
    </div>
  )
}




import { db } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Users,
  Building2,
  Mail,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react"
import Link from "next/link"
import { parseJSON } from "@/lib/utils"
import { VCClaimActions } from "../waitlist/vc-claim-actions"
import { AddEmailForm } from "./add-email-form"

export const dynamic = 'force-dynamic'

export default async function PendingRequestsPage() {
  // Get pending user approvals
  let userApprovals: any[] = []
  try {
    userApprovals = await db.userApproval.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('Error loading user approvals:', error)
  }

  // Get pending VC claims
  const vcClaims = await db.vCClaim.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' },
  })

  const totalPending = userApprovals.length + vcClaims.length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Pending Approval Requests</h1>
            <Badge variant="secondary" className="text-sm">
              {totalPending} pending
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/waitlist">
              <Button variant="ghost" size="sm">
                Waitlist Dashboard
              </Button>
            </Link>
            <Link href="/admin/approvals">
              <Button variant="ghost" size="sm">
                User Approvals
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Stats */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending User Signups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{userApprovals.length}</div>
              <p className="text-xs text-muted-foreground">
                Waiting for approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending VC Claims</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{vcClaims.length}</div>
              <p className="text-xs text-muted-foreground">
                VC profiles awaiting review
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add Email Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add Email to Pending Approvals</CardTitle>
            <CardDescription>Manually add an email address to the pending approvals list</CardDescription>
          </CardHeader>
          <CardContent>
            <AddEmailForm />
          </CardContent>
        </Card>

        {/* Pending User Signups */}
        {userApprovals.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Pending User Signups ({userApprovals.length})</CardTitle>
              <CardDescription>Users waiting for account approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userApprovals.map((approval) => (
                  <div
                    key={approval.email}
                    className="flex items-center justify-between rounded-lg border border-yellow-500 bg-yellow-50/50 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <Mail className="h-5 w-5 text-yellow-600" />
                      <div>
                        <div className="font-medium">{approval.email}</div>
                        <div className="text-xs text-muted-foreground">
                          Requested: {approval.createdAt ? new Date(approval.createdAt).toLocaleString() : 'Unknown'}
                        </div>
                      </div>
                    </div>
                    <Link href="/admin/approvals">
                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending VC Claims */}
        {vcClaims.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending VC Profile Claims ({vcClaims.length})</CardTitle>
              <CardDescription>VC profiles waiting for approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vcClaims.map((claim) => {
                  return (
                    <div
                      key={claim.id}
                      className="rounded-lg border border-yellow-500 bg-yellow-50/50 p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{claim.firmName}</h3>
                            <Badge variant="secondary">Pending</Badge>
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
                            <div className="mt-2 text-xs">
                              <Clock className="mr-1 inline h-3 w-3" />
                              Submitted: {new Date(claim.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <VCClaimActions claimId={claim.id} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {totalPending === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
              <h3 className="mb-2 text-lg font-semibold">All Clear!</h3>
              <p className="text-muted-foreground">
                There are no pending approval requests at this time.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


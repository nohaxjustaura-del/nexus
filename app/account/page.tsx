import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, User, Settings, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function AccountPage() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect('/login?redirect=/account')
    }

    if (!user.emailVerified) {
      redirect(`/verify?redirect=/account&email=${encodeURIComponent(user.email)}`)
    }

    return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-slate-900">Account</h1>
          <p className="text-slate-600">Manage your settings and preferences</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Account Info */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-slate-600">Email</label>
                <p className="text-base font-medium text-slate-900 mt-1">{user.email}</p>
              </div>
              <div>
                <label className="text-sm text-slate-600">Account Type</label>
                <p className="text-base font-medium text-slate-900 mt-1 capitalize">{user.userType || 'Founder'}</p>
              </div>
              <div>
                <label className="text-sm text-slate-600">Status</label>
                <p className="text-base font-medium mt-1">
                  {user.emailVerified ? (
                    <span className="text-green-600">✓ Verified</span>
                  ) : (
                    <span className="text-red-600">Not Verified</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {user.userType === 'founder' || !user.userType ? (
                <>
                  <Link href="/founder/discover">
                    <Button variant="outline" className="w-full justify-between border-slate-200">
                      Discover VCs
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/founder/ai-analysis">
                    <Button variant="outline" className="w-full justify-between border-slate-200">
                      AI Analysis
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/founder/my-analyses">
                    <Button variant="outline" className="w-full justify-between border-slate-200">
                      My Analyses
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/founder/bookmarks">
                    <Button variant="outline" className="w-full justify-between border-slate-200">
                      Bookmarks
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/founder/credits">
                    <Button variant="outline" className="w-full justify-between border-slate-200">
                      Credits
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  {user.email === 'nohaxjustaura@gmail.com' && (
                    <Link href="/founder/vc-database">
                      <Button variant="outline" className="w-full justify-between border-slate-200">
                        VC Database (Admin)
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </>
              ) : user.userType === 'investor' ? (
                <>
                  <Link href="/vc/dashboard">
                    <Button variant="outline" className="w-full justify-between border-slate-200">
                      Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/vc/claim">
                    <Button variant="outline" className="w-full justify-between border-slate-200">
                      Edit Profile
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
  } catch (error) {
    console.error('Account page error:', error)
    redirect('/login?redirect=/account')
  }
}


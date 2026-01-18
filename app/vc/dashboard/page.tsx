'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast-simple"
import { 
  Heart, 
  TrendingUp,
  Users,
  Eye,
  MessageSquare,
  Star,
  ExternalLink,
  Building2,
  DollarSign,
  Loader2,
  FileText,
  Sparkles,
  Filter,
  Download,
  Shield,
  Target,
  Crown,
  CheckCircle,
  Award,
  GraduationCap,
  Zap,
  ChevronLeft,
  ChevronRight,
  FileJson
} from "lucide-react"
import Link from "next/link"

interface Applicant {
  id: string
  name: string
  email: string
  startupName: string | null
  stage: string
  sectors: string[]
  location: string
  fundingNeed: number
  matchScore: number
  hasResumeAnalysis: boolean
  hasPitchDeck: boolean
  applicationStatus: string | null
  createdAt: Date
}

export default function VCDashboard() {
  const [loading, setLoading] = useState(true)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [vcProfile, setVcProfile] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    async function loadData() {
      try {
        const profileRes = await fetch('/api/vc/profile', { credentials: 'include' })
        if (!profileRes.ok) {
          window.location.href = '/vc/claim'
          return
        }

        const profileData = await profileRes.json()
        if (!profileData.exists) {
          window.location.href = '/vc/claim'
          return
        }

        setVcProfile(profileData.profile)

        const applicantsRes = await fetch('/api/vc/applicants', { credentials: 'include' })
        if (applicantsRes.ok) {
          const applicantsData = await applicantsRes.json()
          setApplicants(applicantsData.applicants || [])
        }
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const stats = {
    profileViews: 0,
    interestedFounders: applicants.length,
    applicationsReceived: applicants.filter(a => a.applicationStatus).length,
    matchScore: applicants.length > 0 
      ? Math.round(applicants.reduce((sum, a) => sum + a.matchScore, 0) / applicants.length)
      : 0,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-white flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600 mb-4" />
          <p className="text-lg text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-white">
      {/* Modern Navigation */}
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto max-w-7xl px-4">
          <nav className="flex items-center gap-8 h-14">
            <Link href="/vc/dashboard" className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-4 -mb-px transition-all">
              Dashboard
            </Link>
            <Link href="/vc/claim" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-all pb-4 -mb-px hover:border-b-2 hover:border-blue-600">
              Edit Profile
            </Link>
            <Link href="/account" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-all pb-4 -mb-px hover:border-b-2 hover:border-blue-600">
              Account
            </Link>
          </nav>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Hero Welcome */}
        <div className="mb-8 animate-slide-up">
          <h1 className="mb-2 text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 bg-clip-text text-transparent">
            Welcome, {vcProfile?.firmName || 'VC'}
          </h1>
          <p className="text-lg text-slate-600">
            Here's your curated deal flow • AI-matched founders • Zero spam
          </p>
        </div>

        {/* Stats Grid - Modern Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-slide-up" style={{animationDelay: '0.1s'}}>
          <Card className="border-2 border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 group bg-gradient-to-br from-white to-blue-50/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">Interested Founders</CardTitle>
              <div className="p-2 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
                <Heart className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{stats.interestedFounders}</div>
              <p className="text-sm text-slate-600 mt-1">
                Matched your thesis
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-200 hover:border-emerald-400 hover:shadow-xl transition-all duration-300 group bg-gradient-to-br from-white to-emerald-50/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700 transition-colors">Applications</CardTitle>
              <div className="p-2 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{stats.applicationsReceived}</div>
              <p className="text-sm text-slate-600 mt-1">
                Active applications
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-200 hover:border-amber-400 hover:shadow-xl transition-all duration-300 group bg-gradient-to-br from-white to-amber-50/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 group-hover:text-amber-700 transition-colors">Match Quality</CardTitle>
              <div className="p-2 rounded-lg bg-amber-100 group-hover:bg-amber-200 transition-colors">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900 group-hover:text-amber-700 transition-colors">{stats.matchScore}%</div>
              <p className="text-sm text-slate-600 mt-1">
                Average match score
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-slate-200 hover:border-purple-400 hover:shadow-xl transition-all duration-300 group bg-gradient-to-br from-white to-purple-50/30">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 group-hover:text-purple-700 transition-colors">Profile Views</CardTitle>
              <div className="p-2 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-slate-900 group-hover:text-purple-700 transition-colors">{stats.profileViews}</div>
              <p className="text-sm text-slate-600 mt-1">
                This month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Value Prop Banner */}
        <Card className="mb-8 border-2 border-blue-200 bg-gradient-to-r from-blue-50 via-white to-purple-50 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-up" style={{animationDelay: '0.2s'}}>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">AI-Curated Deal Flow</h2>
                </div>
                <p className="text-base text-slate-700 leading-relaxed">
                  Only high-quality founders reach your dashboard. Every applicant is AI-analyzed, verified, and thesis-matched to save you time.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300 px-3 py-1">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    AI-Screened
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700 border border-blue-300 px-3 py-1">
                    <Shield className="mr-2 h-4 w-4" />
                    Identity Verified
                  </Badge>
                  <Badge className="bg-purple-100 text-purple-700 border border-purple-300 px-3 py-1">
                    <Target className="mr-2 h-4 w-4" />
                    Thesis-Aligned
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/vc/applicants/export', {
                        credentials: 'include',
                      })
                      
                      if (!response.ok) {
                        const error = await response.json()
                        alert(error.message || 'Failed to export founders')
                        return
                      }
                      
                      // Get filename from Content-Disposition header or use default
                      const contentDisposition = response.headers.get('Content-Disposition')
                      const filename = contentDisposition
                        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'matched_founders.csv'
                        : 'matched_founders.csv'
                      
                      // Download the CSV
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = filename
                      document.body.appendChild(a)
                      a.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)
                    } catch (error) {
                      console.error('Export error:', error)
                      alert('Failed to export founders. Please try again.')
                    }
                  }}
                >
                  <Download className="mr-2 h-5 w-5" />
                  Export All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Matches */}
        {applicants.filter(a => a.matchScore >= 85).length > 0 && (
          <Card className="mb-8 border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 shadow-lg animate-slide-up" style={{animationDelay: '0.3s'}}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
                      <Award className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">Top Matches</CardTitle>
                    <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 px-3 py-1 text-sm">
                      <Crown className="mr-1 h-4 w-4" />
                      85%+ Match
                    </Badge>
                  </div>
                  <CardDescription className="text-base text-slate-600">
                    Highest quality founders that perfectly match your criteria
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" className="border-2 border-amber-300 hover:bg-amber-50 font-semibold">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {applicants.filter(a => a.matchScore >= 85).slice(0, 5).map((applicant) => (
                  <div
                    key={applicant.id}
                    className="group flex items-center justify-between rounded-xl border-2 border-amber-200 bg-white/80 p-5 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50/30 hover:border-amber-400 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="flex-1">
                      <div className="mb-3 flex items-center gap-3 flex-wrap">
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-amber-700 transition-colors">{applicant.startupName || 'Unnamed Startup'}</h3>
                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                          <Star className="mr-1 h-3 w-3 fill-white" />
                          {applicant.matchScore}% Match
                        </Badge>
                        {applicant.hasResumeAnalysis && (
                          <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300">
                            <Sparkles className="mr-1 h-3 w-3" />
                            AI Verified
                          </Badge>
                        )}
                        {applicant.hasPitchDeck && (
                          <Badge className="bg-blue-100 text-blue-700 border border-blue-300">
                            <FileText className="mr-1 h-3 w-3" />
                            Pitch Deck
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-5 text-sm text-slate-600 flex-wrap">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Users className="h-4 w-4 text-slate-400" />
                          {applicant.name}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <TrendingUp className="h-4 w-4 text-slate-400" />
                          {applicant.stage}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          {applicant.sectors.slice(0, 2).join(', ')}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="h-4 w-4 text-slate-400" />
                          ${applicant.fundingNeed}K
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-3 items-center shrink-0 ml-4">
                      <Link href={`/founder/discover?founder=${applicant.id}`}>
                        <Button size="sm" variant="outline" className="border-2 hover:bg-slate-50">
                          View Profile
                        </Button>
                      </Link>
                      <a href={`mailto:${applicant.email}`}>
                        <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold shadow-md hover:shadow-lg transition-all">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Contact
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Matches */}
        <Card className="border-2 border-slate-200 shadow-lg animate-slide-up" style={{animationDelay: '0.4s'}}>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900 mb-2">All Matches</CardTitle>
                <CardDescription className="text-base text-slate-600">
                  {applicants.length} qualified founders match your criteria
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-2 font-semibold">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-2 font-semibold"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/vc/applicants/export', {
                        credentials: 'include',
                      })
                      
                      if (!response.ok) {
                        const error = await response.json()
                        toast.error(error.message || 'Failed to export founders')
                        return
                      }
                      
                      // Get filename from Content-Disposition header or use default
                      const contentDisposition = response.headers.get('Content-Disposition')
                      const filename = contentDisposition
                        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'matched_founders.csv'
                        : 'matched_founders.csv'
                      
                      // Download the CSV
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = filename
                      document.body.appendChild(a)
                      a.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)
                      toast.success('Founders exported successfully!')
                    } catch (error) {
                      console.error('Export error:', error)
                      toast.error('Failed to export founders. Please try again.')
                    }
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-2 font-semibold"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/vc/applicants', {
                        credentials: 'include',
                      })
                      
                      if (!response.ok) {
                        const error = await response.json()
                        toast.error(error.message || 'Failed to export founders')
                        return
                      }
                      
                      const data = await response.json()
                      const jsonData = JSON.stringify(data.applicants || [], null, 2)
                      const blob = new Blob([jsonData], { type: 'application/json' })
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `matched_founders_${new Date().toISOString().split('T')[0]}.json`
                      document.body.appendChild(a)
                      a.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)
                      toast.success('Founders exported as JSON!')
                    } catch (error) {
                      console.error('Export error:', error)
                      toast.error('Failed to export founders. Please try again.')
                    }
                  }}
                >
                  <FileJson className="mr-2 h-4 w-4" />
                  Export JSON
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {applicants.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-lg font-semibold text-slate-900 mb-2">No matches yet</p>
                <p className="text-slate-600">Founders will appear here as they complete their profiles and match your criteria.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {applicants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((applicant) => (
                  <div
                    key={applicant.id}
                    className="group flex items-center justify-between rounded-lg border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 hover:border-blue-300 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{applicant.startupName || 'Unnamed Startup'}</h3>
                        <Badge className="bg-blue-100 text-blue-700 border border-blue-300">
                          {applicant.matchScore}% Match
                        </Badge>
                        {!applicant.applicationStatus && (
                          <Badge className="bg-emerald-500 text-white">New</Badge>
                        )}
                        {applicant.hasResumeAnalysis && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            <Sparkles className="mr-1 h-3 w-3" />
                            AI Analyzed
                          </Badge>
                        )}
                        {applicant.hasPitchDeck && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <FileText className="mr-1 h-3 w-3" />
                            Deck
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {applicant.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {applicant.stage}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {applicant.sectors.slice(0, 2).join(', ')}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${applicant.fundingNeed}K
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center ml-4">
                      <Link href={`/founder/discover?founder=${applicant.id}`}>
                        <Button size="sm" variant="outline" className="shrink-0">
                          View Profile
                        </Button>
                      </Link>
                      <a href={`mailto:${applicant.email}`}>
                        <Button size="sm" className="shrink-0 bg-blue-600 hover:bg-blue-700">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Contact
                        </Button>
                      </a>
                    </div>
                  </div>
                  ))}
                </div>
                {applicants.length > itemsPerPage && (
                  <div className="flex items-center justify-between pt-6 border-t">
                    <div className="text-sm text-slate-600">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, applicants.length)} of {applicants.length} founders
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="border-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="text-sm text-slate-600 px-3">
                        Page {currentPage} of {Math.ceil(applicants.length / itemsPerPage)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(applicants.length / itemsPerPage), prev + 1))}
                        disabled={currentPage >= Math.ceil(applicants.length / itemsPerPage)}
                        className="border-2"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Why Founders Choose You */}
        <Card className="mt-8 border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-white shadow-lg animate-slide-up" style={{animationDelay: '0.5s'}}>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">Why Founders Choose You</CardTitle>
            </div>
            <CardDescription className="text-base">
              Features that help you stand out and attract the best founders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-4 p-5 rounded-xl bg-white border-2 border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-300">
                <div className="p-3 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 shrink-0">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-bold text-base mb-2 text-slate-900">Fast Responses</div>
                  <div className="text-sm text-slate-600 leading-relaxed">
                    Founders see your average response time
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-xl bg-white border-2 border-slate-200 hover:border-purple-300 hover:shadow-md transition-all duration-300">
                <div className="p-3 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 shrink-0">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="font-bold text-base mb-2 text-slate-900">Thesis Aligned</div>
                  <div className="text-sm text-slate-600 leading-relaxed">
                    Only matched founders see your profile
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-xl bg-white border-2 border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all duration-300">
                <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 shrink-0">
                  <Shield className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <div className="font-bold text-base mb-2 text-slate-900">Verified Badge</div>
                  <div className="text-sm text-slate-600 leading-relaxed">
                    Builds trust with serious founders
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

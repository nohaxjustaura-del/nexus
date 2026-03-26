'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Database, FileText, FileJson, FileType, Loader2, CheckCircle2, Building2, Shield } from 'lucide-react'
import { toast } from '@/components/ui/toast-simple'
import Link from 'next/link'
import { ADMIN_EMAIL } from '@/lib/constants'

export default function VCDatabasePage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [downloadingCSV, setDownloadingCSV] = useState(false)
  const [downloadingJSON, setDownloadingJSON] = useState(false)

  useEffect(() => {
    // Check if user is admin
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.user?.email === ADMIN_EMAIL) {
            setIsAdmin(true)
          } else {
            setIsAdmin(false)
            router.push('/')
          }
        } else {
          setIsAdmin(false)
          router.push('/')
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [router])

  const handleDownload = async (format: 'pdf' | 'csv' | 'json') => {
    try {
      if (format === 'pdf') {
        setDownloadingPDF(true)
      } else if (format === 'csv') {
        setDownloadingCSV(true)
      } else {
        setDownloadingJSON(true)
      }

      const response = await fetch(`/api/vcs/export?format=${format}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to download database')
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `vc-database-${new Date().toISOString().split('T')[0]}.${format}`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Get the blob
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`VC database downloaded successfully!`)
    } catch (error: any) {
      console.error('Error downloading database:', error)
      toast.error(error.message || 'Failed to download database')
    } finally {
      setDownloadingPDF(false)
      setDownloadingCSV(false)
      setDownloadingJSON(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600 mb-4" />
          <p className="text-lg text-muted-foreground">Checking access...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-blue-100 p-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="mb-2 text-4xl font-bold text-foreground">VC Database Export</h1>
          <p className="text-lg text-muted-foreground">
            Admin-only: Download the complete database of all verified VCs and investors
          </p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">
            <Shield className="h-4 w-4" />
            <span>Admin Access Required</span>
          </div>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Export Options
            </CardTitle>
            <CardDescription>
              Choose your preferred format to download the VC database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* CSV Option - Primary */}
            <div className="rounded-lg border-2 border-blue-500 bg-primary/10 p-6 hover:border-blue-600 transition-colors">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-green-100 p-3">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-semibold">CSV Format</h3>
                    <p className="text-sm text-muted-foreground">
                      Perfect for Excel, Google Sheets, or any spreadsheet application.
                      <br />
                      Includes all VC data in a tabular format with UTF-8 encoding.
                    </p>
                  </div>
                </div>
              </div>
              <div className="ml-16 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Compatible with Excel and Google Sheets</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Easy to filter and sort</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>35+ columns of detailed information</span>
                </div>
              </div>
              <Button
                onClick={() => handleDownload('csv')}
                disabled={downloadingPDF || downloadingCSV || downloadingJSON}
                className="mt-4 w-full"
                size="lg"
              >
                {downloadingCSV ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                  </>
                )}
              </Button>
            </div>

            {/* PDF Option */}
            <div className="rounded-lg border-2 border-border p-6 hover:border-blue-300 transition-colors">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-red-100 p-3">
                    <FileType className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-semibold">PDF Format</h3>
                    <p className="text-sm text-muted-foreground">
                      Professional document format, perfect for printing and sharing.
                      <br />
                      Beautifully formatted with all VC details in an easy-to-read layout.
                    </p>
                  </div>
                </div>
              </div>
              <div className="ml-16 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-red-500" />
                  <span>Professional formatting and layout</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-red-500" />
                  <span>Perfect for printing and sharing</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-red-500" />
                  <span>All VC information included</span>
                </div>
              </div>
              <Button
                onClick={() => handleDownload('pdf')}
                disabled={downloadingPDF || downloadingCSV || downloadingJSON}
                className="mt-4 w-full"
                size="lg"
                variant="outline"
              >
                {downloadingPDF ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </>
                )}
              </Button>
            </div>

            {/* JSON Option */}
            <div className="rounded-lg border-2 border-border p-6 hover:border-blue-300 transition-colors">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-purple-100 p-3">
                    <FileJson className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-lg font-semibold">JSON Format</h3>
                    <p className="text-sm text-muted-foreground">
                      Ideal for developers, APIs, or programmatic access.
                      <br />
                      Structured data with nested arrays and objects preserved.
                    </p>
                  </div>
                </div>
              </div>
              <div className="ml-16 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-purple-500" />
                  <span>Preserves nested data structures</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-purple-500" />
                  <span>Easy to parse programmatically</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-purple-500" />
                  <span>Includes metadata and timestamps</span>
                </div>
              </div>
              <Button
                onClick={() => handleDownload('json')}
                disabled={downloadingPDF || downloadingCSV || downloadingJSON}
                className="mt-4 w-full"
                size="lg"
                variant="outline"
              >
                {downloadingJSON ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download JSON
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">What's Included?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold">Profile Information</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Name, Email, Firm Name</li>
                  <li>• Bio and Profile Photos</li>
                  <li>• Verification Status</li>
                  <li>• Profile Completeness</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Investment Details</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Investment Stages</li>
                  <li>• Check Size Range</li>
                  <li>• Sectors of Interest</li>
                  <li>• Geographic Focus</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Firm Information</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Fund Type & Size</li>
                  <li>• Portfolio Companies</li>
                  <li>• Notable Investments</li>
                  <li>• Investment Thesis</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Contact & Links</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Website URLs</li>
                  <li>• LinkedIn Profiles</li>
                  <li>• Application URLs</li>
                  <li>• Social Media Links</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link href="/founder/discover">
            <Button variant="ghost">
              ← Back to Discover VCs
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}


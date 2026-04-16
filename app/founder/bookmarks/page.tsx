'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ExternalLink,
  DollarSign,
  TrendingUp,
  Building2,
  Trash2,
  MessageSquare,
  Target,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { toast } from '@/components/ui/toast-simple'
import { fmtCheckRange } from '@/lib/utils'
import { FounderWorkspaceTabs } from '@/components/founder-workspace-tabs'

interface Bookmark {
  id: string
  notes: string | null
  createdAt: string
  investor: {
    id: string
    firmName: string
    name: string
    checkMin: number
    checkMax: number
    stages: string
    sectors: string
    applicationUrl: string | null
    websiteUrl: string | null
  }
}

export default function BookmarksPage() {
  const [loading, setLoading] = useState<boolean>(true)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBookmarks() {
      try {
        const res = await fetch('/api/bookmarks', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setBookmarks(data.bookmarks || [])
        }
      } catch (e) {
        console.error('Failed to fetch bookmarks:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchBookmarks()
  }, [])

  const handleDelete = async (investorId: string, bookmarkId: string) => {
    if (!confirm('Remove this bookmark?')) return
    
    setDeleting(bookmarkId)
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ investorId })
      })
      
      if (res.ok) {
        setBookmarks(prev => prev.filter(b => b.id !== bookmarkId))
      }
    } catch (e) {
      toast.error('Failed to remove bookmark')
    } finally {
      setDeleting(null)
    }
  }

  // Parse JSON strings for stages and sectors
  const parseJsonArray = (str: string): string[] => {
    try {
      return JSON.parse(str)
    } catch {
      return []
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-page-mesh bg-dot-grid" aria-hidden />
      <div className="page-shell-narrow">
        <div className="mb-6">
          <FounderWorkspaceTabs />
        </div>

        <div className="mb-6 rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur-sm md:p-6">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Your Bookmarked VCs</h1>
          <p className="text-muted-foreground">
            {bookmarks.length} investor{bookmarks.length !== 1 ? 's' : ''} saved
          </p>
        </div>

        {bookmarks.length === 0 ? (
          <Card className="border-border/60 bg-card/70 p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-primary/10 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-foreground">No Bookmarks Yet</h2>
            <p className="mb-2 text-muted-foreground max-w-md mx-auto">
              Start exploring and save your favorite VCs to keep track of them
            </p>
            <p className="mb-6 text-sm text-slate-500">
              Click the heart icon on any VC card to bookmark them
            </p>
            <Link href="/founder/discover">
              <Button size="lg" className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700">
                <Target className="mr-2 h-5 w-5" />
                Discover VCs
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {bookmarks.map((bookmark) => {
              const { investor } = bookmark
              const stages = parseJsonArray(investor.stages)
              const sectors = parseJsonArray(investor.sectors)
              
              return (
                <Card key={bookmark.id} className="flex flex-col border-border/60 bg-card/70 shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="mb-1">{investor.firmName}</CardTitle>
                        <p className="text-sm text-muted-foreground">{investor.name}</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4">
                    {/* Check Size */}
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {fmtCheckRange(investor.checkMin, investor.checkMax)}
                      </span>
                    </div>

                    {/* Stages */}
                    {stages.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-wrap gap-1">
                          {stages.map((stage) => (
                            <Badge key={stage} variant="outline" className="text-xs">
                              {stage}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sectors */}
                    {sectors.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-wrap gap-1">
                          {sectors.map((sector) => (
                            <Badge key={sector} variant="outline" className="text-xs">
                              {sector}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {bookmark.notes && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          Your Notes
                        </div>
                        <p className="text-sm">{bookmark.notes}</p>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex gap-2">
                    {investor.applicationUrl && (
                      <a href={investor.applicationUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button className="w-full" size="sm">
                          Apply
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    {investor.websiteUrl && !investor.applicationUrl && (
                      <a href={investor.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button className="w-full" size="sm" variant="outline">
                          Visit Website
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={deleting === bookmark.id}
                      onClick={() => handleDelete(investor.id, bookmark.id)}
                    >
                      {deleting === bookmark.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

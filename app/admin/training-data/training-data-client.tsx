'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Download,
  Database,
  Video,
  FileText,
  Lightbulb,
  RefreshCw,
  Calendar,
  Filter,
  User,
  Clock,
  HardDrive,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mic,
} from 'lucide-react'

interface TrainingDataExport {
  exportedAt: string
  /** ISO time after which signedDownloadUrl links stop working (re-export to refresh). */
  signedUrlsExpireAt?: string
  filters: { since: string | null; type: string }
  counts: {
    videoPitches: number
    pitchDecks: number
    pitchIdeas: number
    voiceRecordings: number
    total: number
  }
  videoPitches: any[]
  pitchDecks: any[]
  pitchIdeas: any[]
  voiceRecordings: any[]
}

export default function TrainingDataPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<TrainingDataExport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sinceFilter, setSinceFilter] = useState<string>('')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    videoPitches: true,
    pitchDecks: true,
    pitchIdeas: true,
    voiceRecordings: true,
  })
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      let url = '/api/training-data'
      const params = new URLSearchParams()
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter)
      if (sinceFilter) params.set('since', sinceFilter)
      if (params.toString()) url += `?${params.toString()}`

      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e?.message || 'Failed to load training data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleApplyFilters = () => {
    fetchData()
  }

  const handleDownloadJSON = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const dateStr = new Date().toISOString().slice(0, 10)
    a.download = `training-data-${dateStr}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateText = (text: string | null, maxLen = 120) => {
    if (!text) return '-'
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                Training data
              </h1>
              <p className="text-sm text-muted-foreground">
                Export pitches, decks, and recordings for model work. JSON includes{' '}
                <code className="text-xs">signedDownloadUrl</code> for media files when storage is configured.
              </p>
              {data?.signedUrlsExpireAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Signed download links expire {formatDate(data.signedUrlsExpireAt)}. Download JSON again to refresh.
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleDownloadJSON} disabled={!data || data.counts.total === 0}>
              <Download className="mr-2 h-4 w-4" />
              Download JSON
            </Button>
          </div>
        </div>
        {/* Error */}
        {error && (
          <Card className="mb-6 border-red-300 bg-red-50">
            <CardContent className="py-4 text-sm text-red-800">
              {error}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  <Filter className="inline h-3 w-3 mr-1" />
                  Type
                </label>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="rounded-md border border-border px-3 py-2 text-sm bg-card"
                >
                  <option value="all">All Types</option>
                  <option value="video">Video Pitches</option>
                  <option value="deck">Pitch Decks</option>
                  <option value="idea">Pitch Ideas</option>
                  <option value="voice">Voice Recordings</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Since
                </label>
                <input
                  type="date"
                  value={sinceFilter}
                  onChange={e => setSinceFilter(e.target.value)}
                  className="rounded-md border border-border px-3 py-2 text-sm bg-card"
                />
              </div>
              <Button size="sm" onClick={handleApplyFilters} disabled={loading}>
                Apply Filters
              </Button>
              {(typeFilter !== 'all' || sinceFilter) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTypeFilter('all')
                    setSinceFilter('')
                    setTimeout(fetchData, 0)
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-muted-foreground">Loading training data...</span>
          </div>
        )}

        {/* Stats */}
        {data && !loading && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-foreground">{data.counts.total}</p>
                      <p className="text-sm text-muted-foreground">Total Records</p>
                    </div>
                    <Database className="h-8 w-8 text-blue-600 opacity-60" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-purple-700">{data.counts.videoPitches}</p>
                      <p className="text-sm text-muted-foreground">Video Pitches</p>
                    </div>
                    <Video className="h-8 w-8 text-purple-600 opacity-60" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-green-700">{data.counts.pitchDecks}</p>
                      <p className="text-sm text-muted-foreground">Pitch Decks</p>
                    </div>
                    <FileText className="h-8 w-8 text-green-600 opacity-60" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-amber-700">{data.counts.pitchIdeas}</p>
                      <p className="text-sm text-muted-foreground">Pitch Ideas</p>
                    </div>
                    <Lightbulb className="h-8 w-8 text-amber-600 opacity-60" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-rose-700">{data.counts.voiceRecordings || 0}</p>
                      <p className="text-sm text-muted-foreground">Voice Recordings</p>
                    </div>
                    <Mic className="h-8 w-8 text-rose-600 opacity-60" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Exported timestamp */}
            <p className="text-xs text-slate-500 mb-6">
              Exported at {formatDate(data.exportedAt)}
              {data.filters.since && ` · Filtered since ${data.filters.since}`}
              {data.filters.type !== 'all' && ` · Type: ${data.filters.type}`}
            </p>

            {/* Video Pitches */}
            {data.videoPitches.length > 0 && (
              <Card className="mb-6">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSection('videoPitches')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Video className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-lg">Video Pitches</CardTitle>
                      <Badge variant="secondary">{data.videoPitches.length}</Badge>
                    </div>
                    {expandedSections.videoPitches ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <CardDescription>Video/audio files with transcripts and founder context</CardDescription>
                </CardHeader>
                {expandedSections.videoPitches && (
                  <CardContent>
                    <div className="space-y-3">
                      {data.videoPitches.map((vp: any) => (
                        <div
                          key={vp.id}
                          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-foreground">{vp.fileName}</span>
                                <Badge variant="outline" className="text-xs">{vp.fileType || 'mp4'}</Badge>
                                <span className="text-xs text-slate-500">{formatFileSize(vp.fileSize)}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(vp.createdAt)}
                                </span>
                                {vp.founderSnapshot?.name && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {vp.founderSnapshot.name}
                                  </span>
                                )}
                                {vp.filePath && (
                                  <span className="flex items-center gap-1">
                                    <HardDrive className="h-3 w-3" />
                                    {vp.filePath}
                                  </span>
                                )}
                                {vp.signedDownloadUrl && (
                                  <a
                                    href={vp.signedDownloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" aria-hidden />
                                    Download media
                                  </a>
                                )}
                              </div>
                              {vp.transcriptText && (
                                <p className="mt-2 text-xs text-muted-foreground bg-muted rounded p-2">
                                  {expandedRows.has(vp.id)
                                    ? vp.transcriptText
                                    : truncateText(vp.transcriptText, 200)}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRow(vp.id)}
                            >
                              {expandedRows.has(vp.id) ? 'Collapse' : 'Expand'}
                            </Button>
                          </div>

                          {expandedRows.has(vp.id) && (
                            <div className="mt-3 pt-3 border-t space-y-3">
                              {vp.founderSnapshot && (
                                <div>
                                  <h4 className="text-xs font-semibold text-foreground/85 mb-1">Founder Snapshot</h4>
                                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-40">
                                    {JSON.stringify(vp.founderSnapshot, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {vp.analysisResult && (
                                <div>
                                  <h4 className="text-xs font-semibold text-foreground/85 mb-1">Analysis Result</h4>
                                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-40">
                                    {JSON.stringify(vp.analysisResult, null, 2).substring(0, 2000)}
                                    {JSON.stringify(vp.analysisResult).length > 2000 && '\n... (truncated)'}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Pitch Decks */}
            {data.pitchDecks.length > 0 && (
              <Card className="mb-6">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSection('pitchDecks')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-lg">Pitch Decks</CardTitle>
                      <Badge variant="secondary">{data.pitchDecks.length}</Badge>
                    </div>
                    {expandedSections.pitchDecks ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <CardDescription>Uploaded decks with extracted text and analysis</CardDescription>
                </CardHeader>
                {expandedSections.pitchDecks && (
                  <CardContent>
                    <div className="space-y-3">
                      {data.pitchDecks.map((pd: any) => (
                        <div
                          key={pd.id}
                          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-foreground">{pd.fileName}</span>
                                <Badge variant="outline" className="text-xs">{pd.fileType || 'pdf'}</Badge>
                                <span className="text-xs text-slate-500">{formatFileSize(pd.fileSize)}</span>
                                {pd.overallScore != null && (
                                  <Badge className={`text-xs ${pd.overallScore >= 70 ? 'bg-green-100 text-green-800' : pd.overallScore >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                    Score: {pd.overallScore}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(pd.createdAt)}
                                </span>
                                {pd.founderSnapshot?.name && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {pd.founderSnapshot.name}
                                  </span>
                                )}
                                {pd.filePath && (
                                  <span className="flex items-center gap-1">
                                    <HardDrive className="h-3 w-3" />
                                    {pd.filePath}
                                  </span>
                                )}
                                {pd.signedDownloadUrl && (
                                  <a
                                    href={pd.signedDownloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" aria-hidden />
                                    Download file
                                  </a>
                                )}
                              </div>
                              {pd.extractedText && (
                                <p className="mt-2 text-xs text-muted-foreground bg-muted rounded p-2">
                                  {expandedRows.has(pd.id)
                                    ? pd.extractedText
                                    : truncateText(pd.extractedText, 200)}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRow(pd.id)}
                            >
                              {expandedRows.has(pd.id) ? 'Collapse' : 'Expand'}
                            </Button>
                          </div>

                          {expandedRows.has(pd.id) && (
                            <div className="mt-3 pt-3 border-t space-y-3">
                              {pd.founderSnapshot && (
                                <div>
                                  <h4 className="text-xs font-semibold text-foreground/85 mb-1">Founder Snapshot</h4>
                                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-40">
                                    {JSON.stringify(pd.founderSnapshot, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {pd.analysisResult && (
                                <div>
                                  <h4 className="text-xs font-semibold text-foreground/85 mb-1">Analysis Result</h4>
                                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-40">
                                    {JSON.stringify(pd.analysisResult, null, 2).substring(0, 2000)}
                                    {JSON.stringify(pd.analysisResult).length > 2000 && '\n... (truncated)'}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Pitch Ideas */}
            {data.pitchIdeas.length > 0 && (
              <Card className="mb-6">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSection('pitchIdeas')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Lightbulb className="h-5 w-5 text-amber-600" />
                      <CardTitle className="text-lg">Pitch Ideas</CardTitle>
                      <Badge variant="secondary">{data.pitchIdeas.length}</Badge>
                    </div>
                    {expandedSections.pitchIdeas ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <CardDescription>Text-based pitch submissions with analysis</CardDescription>
                </CardHeader>
                {expandedSections.pitchIdeas && (
                  <CardContent>
                    <div className="space-y-3">
                      {data.pitchIdeas.map((pi: any) => (
                        <div
                          key={pi.id}
                          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-foreground">
                                  Pitch Idea
                                </span>
                                <span className="text-xs text-slate-500">
                                  {pi.ideaText?.length || 0} chars
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(pi.createdAt)}
                                </span>
                                {pi.founderSnapshot?.name && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {pi.founderSnapshot.name}
                                  </span>
                                )}
                              </div>
                              {pi.ideaText && (
                                <p className="mt-2 text-xs text-muted-foreground bg-muted rounded p-2">
                                  {expandedRows.has(pi.id)
                                    ? pi.ideaText
                                    : truncateText(pi.ideaText, 200)}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRow(pi.id)}
                            >
                              {expandedRows.has(pi.id) ? 'Collapse' : 'Expand'}
                            </Button>
                          </div>

                          {expandedRows.has(pi.id) && (
                            <div className="mt-3 pt-3 border-t space-y-3">
                              {pi.founderSnapshot && (
                                <div>
                                  <h4 className="text-xs font-semibold text-foreground/85 mb-1">Founder Snapshot</h4>
                                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-40">
                                    {JSON.stringify(pi.founderSnapshot, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {pi.analysisResult && (
                                <div>
                                  <h4 className="text-xs font-semibold text-foreground/85 mb-1">Analysis Result</h4>
                                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-40">
                                    {JSON.stringify(pi.analysisResult, null, 2).substring(0, 2000)}
                                    {JSON.stringify(pi.analysisResult).length > 2000 && '\n... (truncated)'}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Voice Recordings */}
            {data.voiceRecordings && data.voiceRecordings.length > 0 && (
              <Card className="mb-6">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSection('voiceRecordings')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mic className="h-5 w-5 text-rose-600" />
                      <CardTitle className="text-lg">Voice Recordings</CardTitle>
                      <Badge variant="secondary">{data.voiceRecordings.length}</Badge>
                    </div>
                    {expandedSections.voiceRecordings ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <CardDescription>Speech-to-text voice recordings from pitch idea submissions</CardDescription>
                </CardHeader>
                {expandedSections.voiceRecordings && (
                  <CardContent>
                    <div className="space-y-3">
                      {data.voiceRecordings.map((vr: any) => (
                        <div
                          key={vr.id}
                          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-foreground">{vr.fileName}</span>
                                <Badge variant="outline" className="text-xs">{vr.fileType || 'audio'}</Badge>
                                <span className="text-xs text-slate-500">{formatFileSize(vr.fileSize)}</span>
                                {vr.durationSeconds && (
                                  <Badge className="text-xs bg-rose-100 text-rose-800">
                                    {Math.floor(vr.durationSeconds / 60)}:{String(Math.floor(vr.durationSeconds % 60)).padStart(2, '0')}
                                  </Badge>
                                )}
                                {vr.language && (
                                  <Badge variant="outline" className="text-xs">{vr.language}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(vr.createdAt)}
                                </span>
                                {vr.founderSnapshot?.name && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {vr.founderSnapshot.name}
                                  </span>
                                )}
                                {vr.filePath && (
                                  <span className="flex items-center gap-1">
                                    <HardDrive className="h-3 w-3" />
                                    {vr.filePath}
                                  </span>
                                )}
                                {vr.signedDownloadUrl && (
                                  <a
                                    href={vr.signedDownloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" aria-hidden />
                                    Download audio
                                  </a>
                                )}
                                {vr.pitchIdeaAnalysisId && (
                                  <Badge variant="outline" className="text-xs bg-amber-500/10">
                                    Linked to Pitch Idea
                                  </Badge>
                                )}
                              </div>
                              {vr.transcript && (
                                <p className="mt-2 text-xs text-muted-foreground bg-muted rounded p-2">
                                  {expandedRows.has(vr.id)
                                    ? vr.transcript
                                    : truncateText(vr.transcript, 200)}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRow(vr.id)}
                            >
                              {expandedRows.has(vr.id) ? 'Collapse' : 'Expand'}
                            </Button>
                          </div>

                          {expandedRows.has(vr.id) && (
                            <div className="mt-3 pt-3 border-t space-y-3">
                              {vr.founderSnapshot && (
                                <div>
                                  <h4 className="text-xs font-semibold text-foreground/85 mb-1">Founder Snapshot</h4>
                                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-40">
                                    {JSON.stringify(vr.founderSnapshot, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Empty state */}
            {data.counts.total === 0 && (
              <Card>
                <CardContent className="py-16 text-center">
                  <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground/85 mb-2">No Training Data Yet</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Training data will appear here after users submit video pitches, pitch decks,
                    text pitch ideas, or voice recordings through the analysis pages.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}


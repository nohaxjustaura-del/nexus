'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Sparkles, AlertCircle, Layers, User, Video, FileText, CheckCircle, Lightbulb } from 'lucide-react'
import SmartMatchResults from '@/components/smart-match-results'
import AnalysisDashboard from '@/components/analysis/AnalysisDashboard'
import type { UniversalAnalysisResult } from '@/lib/universal-analysis-engine'
import { STRUCTURED_QA_KEYS, type StructuredQaAnswers } from '@/lib/unified-pitch/structured-qa'
import { CREDIT_COSTS } from '@/lib/constants'
import {
  getUserCreditsClient,
  invalidateUserCreditsClientCache,
} from '@/lib/client/user-credits-client'

const UNIFIED_CREDITS = CREDIT_COSTS.UNIFIED_PITCH
const REVIEWER_CREDITS = CREDIT_COSTS.VIDEO_PITCH.REVIEWER

function isSafeRubricForDashboard(raw: unknown): raw is UniversalAnalysisResult {
  if (raw == null || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  if (typeof o.globalVerdict !== 'string') return false
  const cat = o.categories
  if (cat == null || typeof cat !== 'object') return false
  const c = cat as Record<string, unknown>
  for (const k of ['market', 'moat', 'founderFit', 'momentum'] as const) {
    const x = c[k]
    if (x == null || typeof x !== 'object') return false
    const row = x as Record<string, unknown>
    if (typeof row.score !== 'number' || !Number.isFinite(row.score)) return false
    if (!Array.isArray(row.bullets)) return false
  }
  const ex = c.execution
  if (ex != null && typeof ex === 'object') {
    const row = ex as Record<string, unknown>
    if (typeof row.score !== 'number' || !Array.isArray(row.bullets)) return false
  }
  return true
}

function postFormDataWithUploadProgress(
  url: string,
  formData: FormData,
  onUploadProgress: (pct: number) => void,
  onUploadFinished: () => void,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.withCredentials = true
    xhr.responseType = 'text'

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onUploadProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)))
      }
    }
    xhr.upload.onloadend = () => {
      onUploadProgress(100)
      onUploadFinished()
    }

    xhr.onload = () => {
      let data: unknown
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {}
      } catch {
        data = { parseError: true, snippet: String(xhr.responseText).slice(0, 200) }
      }
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data,
      })
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.onabort = () => reject(new Error('Request aborted'))

    onUploadProgress(0)
    xhr.send(formData)
  })
}

export function UnifiedPitchTab() {
  const [answers, setAnswers] = useState<StructuredQaAnswers>({})
  const [deckFile, setDeckFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploadFinished, setUploadFinished] = useState(false)
  const [serverSyntheticPct, setServerSyntheticPct] = useState(0)
  const serverStartRef = useRef<number>(0)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [credits, setCredits] = useState<{ credits: number; isPremium: boolean } | null>(null)
  const [reviewType, setReviewType] = useState<'ai' | 'reviewer'>('ai')
  const [selectedReviewer, setSelectedReviewer] = useState<string | null>(null)
  const [reviewers, setReviewers] = useState<any[]>([])

  useEffect(() => {
    getUserCreditsClient()
      .then(({ ok, data }) => {
        if (ok) setCredits(data as { credits: number; isPremium: boolean })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (reviewType === 'reviewer') {
      fetch('/api/reviewers')
        .then((r) => r.json())
        .then((d) => setReviewers(d.reviewers || []))
        .catch(() => {})
    }
  }, [reviewType])

  // #region agent log
  useEffect(() => {
    return () => {
      fetch('http://127.0.0.1:7471/ingest/0f685c44-f6c8-4b99-b23e-84e0cc9d4f08', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '3018ec' },
        body: JSON.stringify({
          sessionId: '3018ec',
          location: 'unified-pitch-tab.tsx:unmount',
          message: 'UnifiedPitchTab unmounted',
          data: {},
          timestamp: Date.now(),
          hypothesisId: 'D',
        }),
      }).catch(() => {})
    }
  }, [])
  // #endregion

  useEffect(() => {
    if (!analyzing || !uploadFinished) return
    serverStartRef.current = Date.now()
    setServerSyntheticPct(35)
    const id = window.setInterval(() => {
      const elapsed = Date.now() - serverStartRef.current
      // Ease toward ~92% over ~3 minutes so the bar keeps moving during long server work
      const t = Math.min(1, elapsed / 180_000)
      const eased = 35 + t * 57
      setServerSyntheticPct((prev) => Math.max(prev, Math.min(92, eased)))
    }, 800)
    return () => window.clearInterval(id)
  }, [analyzing, uploadFinished])

  const hasQa = STRUCTURED_QA_KEYS.some(({ key }) => !!(answers[key]?.trim()))
  const canSubmit = hasQa || !!deckFile || !!videoFile
  const creditCost = reviewType === 'reviewer' ? REVIEWER_CREDITS : UNIFIED_CREDITS

  const hasLargeUpload = !!(deckFile || videoFile)
  const progressBarValue = !analyzing
    ? 0
    : !uploadFinished
      ? hasLargeUpload
        ? Math.round((uploadPct / 100) * 35)
        : 30
      : Math.min(100, Math.round(serverSyntheticPct))

  const progressLabel = !analyzing
    ? ''
    : !uploadFinished && hasLargeUpload
      ? `Uploading files… ${uploadPct}%`
      : !uploadFinished
        ? 'Sending request…'
        : 'Analyzing on server (matching, scoring, market intel)…'

  const handleAnalyze = async () => {
    if (!canSubmit) {
      setError('Add at least one: Q&A answers, a pitch deck, or a video.')
      return
    }
    if (!credits) {
      setError('Loading credits… try again in a moment.')
      return
    }
    if (!credits.isPremium && (credits.credits ?? 0) < creditCost) {
      setError(
        `Insufficient credits. This run costs ${creditCost} credits; you have ${credits.credits ?? 0}.`,
      )
      return
    }
    setAnalyzing(true)
    setUploadPct(0)
    setUploadFinished(false)
    setServerSyntheticPct(0)
    setError(null)
    setWarnings([])

    try {
      const formData = new FormData()
      formData.append('qa', JSON.stringify(answers))
      if (deckFile) formData.append('deck', deckFile)
      if (videoFile) formData.append('video', videoFile)
      formData.append('reviewType', reviewType)
      if (reviewType === 'reviewer' && selectedReviewer) formData.append('reviewerId', selectedReviewer)

      const { ok, status, data } = await postFormDataWithUploadProgress(
        '/api/analyze-unified-pitch',
        formData,
        (pct) => setUploadPct(pct),
        () => setUploadFinished(true),
      )

      setUploadFinished(true)
      setServerSyntheticPct(100)

      const payload = data as Record<string, unknown>

      // #region agent log
      fetch('http://127.0.0.1:7471/ingest/0f685c44-f6c8-4b99-b23e-84e0cc9d4f08', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '3018ec' },
        body: JSON.stringify({
          sessionId: '3018ec',
          location: 'unified-pitch-tab.tsx:handleAnalyze:afterXhr',
          message: 'Unified pitch XHR completed',
          data: {
            status,
            ok,
            hasAnalysis: payload && typeof payload === 'object' && 'analysis' in payload,
            matchedLen: Array.isArray((payload.analysis as any)?.matchedVCs)
              ? (payload.analysis as any).matchedVCs.length
              : -1,
            parseError: payload?.parseError === true,
          },
          timestamp: Date.now(),
          hypothesisId: 'A,E',
        }),
      }).catch(() => {})
      // #endregion

      if (!ok) {
        if (status === 402) {
          setError((payload.message as string) || 'Insufficient credits.')
          invalidateUserCreditsClientCache()
          const { ok: crOk, data: cr } = await getUserCreditsClient()
          if (crOk) setCredits(cr as { credits: number; isPremium: boolean })
          return
        }
        if (status === 404 && typeof payload.redirectTo === 'string') {
          window.location.replace(payload.redirectTo as string)
          return
        }
        throw new Error(
          (payload.message as string) || (payload.error as string) || 'Analysis failed',
        )
      }

      if (payload.parseError) {
        throw new Error('Invalid response from server. Try again or check the dev console.')
      }

      if (payload.reviewId) {
        setResult({
          reviewSubmitted: true,
          message: payload.message,
          videoPitchId: payload.videoPitchId,
        })
        setWarnings((payload.warnings as string[]) || [])
      } else {
        const analysis = payload.analysis as Record<string, unknown> | undefined
        setResult({ ...analysis, videoPitchId: payload.videoPitchId })
        setWarnings((payload.warnings as string[]) || [])
      }

      // #region agent log
      fetch('http://127.0.0.1:7471/ingest/0f685c44-f6c8-4b99-b23e-84e0cc9d4f08', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '3018ec' },
        body: JSON.stringify({
          sessionId: '3018ec',
          location: 'unified-pitch-tab.tsx:handleAnalyze:afterSetResult',
          message: 'setResult scheduled',
          data: { reviewFlow: !!payload.reviewId },
          timestamp: Date.now(),
          hypothesisId: 'B',
        }),
      }).catch(() => {})
      // #endregion

      invalidateUserCreditsClientCache()
      const { ok: crOk, data: cr } = await getUserCreditsClient()
      if (crOk) setCredits(cr as { credits: number; isPremium: boolean })

      requestAnimationFrame(() => {
        document.getElementById('analysis-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } catch (e: unknown) {
      // #region agent log
      fetch('http://127.0.0.1:7471/ingest/0f685c44-f6c8-4b99-b23e-84e0cc9d4f08', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '3018ec' },
        body: JSON.stringify({
          sessionId: '3018ec',
          location: 'unified-pitch-tab.tsx:handleAnalyze:catch',
          message: String(e instanceof Error ? e.message : e),
          data: {},
          timestamp: Date.now(),
          hypothesisId: 'F',
        }),
      }).catch(() => {})
      // #endregion
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setAnalyzing(false)
      setUploadFinished(false)
      setUploadPct(0)
      setServerSyntheticPct(0)
    }
  }

  const safeRubric =
    result && !result.reviewSubmitted && isSafeRubricForDashboard(result.rubricAnalysis)
      ? result.rubricAnalysis
      : null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="border border-primary/25 bg-gradient-to-br from-primary/8 via-background to-violet-500/8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            One analysis — all your materials
          </CardTitle>
          <CardDescription>
            Add structured answers, an optional deck, and/or a video. We combine everything you provide;{' '}
            <span className="font-medium text-foreground">the more you share, the richer the score and investor matches</span>.{' '}
            At least one source required.{' '}
            <span className="font-medium text-foreground">{UNIFIED_CREDITS} credits</span> (AI) or{' '}
            <span className="font-medium text-foreground">{REVIEWER_CREDITS}</span> with human review.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Structured Q&A</CardTitle>
          <CardDescription>Optional but recommended — answer any questions that apply.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {STRUCTURED_QA_KEYS.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Textarea
                id={key}
                rows={3}
                value={answers[key] || ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [key]: e.target.value }))}
                placeholder="Your answer…"
                className="resize-y min-h-[72px]"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-4 w-4" />
            Pitch deck (optional)
          </CardTitle>
          <CardDescription>PDF or PPTX</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept=".pdf,.pptx,.ppt,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            onChange={(e) => setDeckFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          {deckFile && <p className="mt-2 text-sm text-muted-foreground">{deckFile.name}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-4 w-4" />
            Video pitch (optional)
          </CardTitle>
          <CardDescription>MP4, MOV, or WebM</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          {videoFile && <p className="mt-2 text-sm text-muted-foreground">{videoFile.name}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-4 w-4" />
            Review type
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="reviewType"
              checked={reviewType === 'ai'}
              onChange={() => setReviewType('ai')}
            />
            AI analysis ({UNIFIED_CREDITS} credits)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="reviewType"
              checked={reviewType === 'reviewer'}
              onChange={() => setReviewType('reviewer')}
            />
            Human reviewer ({REVIEWER_CREDITS} credits)
          </label>
        </CardContent>
        {reviewType === 'reviewer' && (
          <CardContent className="pt-0">
            <Label htmlFor="reviewer">Reviewer</Label>
            <select
              id="reviewer"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedReviewer || ''}
              onChange={(e) => setSelectedReviewer(e.target.value || null)}
            >
              <option value="">Select…</option>
              {reviewers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </CardContent>
        )}
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
          <p className="font-medium">Warnings (analysis continued)</p>
          <ul className="mt-1 list-inside list-disc">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {analyzing && (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium text-foreground">{progressLabel}</p>
          <Progress value={progressBarValue} className="h-3" />
          <p className="text-xs text-muted-foreground">
            Upload share of the bar is exact; server work is a time-based estimate (runs can take 30s–several minutes).
          </p>
        </div>
      )}

      <div className="flex justify-center">
        <Button size="lg" onClick={handleAnalyze} disabled={analyzing || !canSubmit} className="gap-2">
          {analyzing ? (
            'Analyzing…'
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Run analysis ({creditCost} credits)
            </>
          )}
        </Button>
      </div>

      {result?.reviewSubmitted && (
        <Card id="analysis-results" className="border-primary/30">
          <CardHeader>
            <CardTitle>Submitted for review</CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {result && !result.reviewSubmitted && (
        <div id="analysis-results" className="space-y-6">
          {safeRubric ? (
            <AnalysisDashboard
              result={safeRubric}
              finalScore={result.finalScore ?? result.overallScore}
            />
          ) : (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Analysis results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="text-sm text-muted-foreground">Overall score</div>
                  <div className="text-3xl font-bold text-primary">
                    {result.overallScore ?? result.finalScore ?? 0}/100
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!safeRubric && (
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 dark:bg-green-950/20">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Strengths
                    </h3>
                    <ul className="space-y-2 text-sm">
                      {(result.strengths || []).map((s: string, i: number) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-green-600">✓</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4 dark:bg-orange-950/20">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      Improvements
                    </h3>
                    <ul className="space-y-2 text-sm">
                      {(result.weaknesses || []).map((s: string, i: number) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {result.improvements?.length > 0 && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:bg-blue-950/20">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      Suggestions
                    </h3>
                    <ul className="space-y-2 text-sm">
                      {result.improvements.map((s: string, i: number) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {result.transcript && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Combined pitch (excerpt)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">
                  {result.transcript}
                </pre>
              </CardContent>
            </Card>
          )}

          <SmartMatchResults matches={result.matchedVCs || []} />
        </div>
      )}
    </div>
  )
}

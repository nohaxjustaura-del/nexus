'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Sparkles, TrendingUp, AlertCircle, CheckCircle, Lightbulb, Target, ExternalLink, FileText, Crown, Mic, Loader2 } from "lucide-react"
import Link from "next/link"
import SmartMatchResults from '@/components/smart-match-results'
import AnalysisDashboard from '@/components/analysis/AnalysisDashboard'

export function PitchIdeaAnalysisTab() {
  const [ideaText, setIdeaText] = useState('')
  const [ideaFile, setIdeaFile] = useState<File | null>(null)
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [credits, setCredits] = useState<{ credits: number; isPremium: boolean } | null>(null)
  const [requestingFeedback, setRequestingFeedback] = useState(false)
  const PITCH_IDEA_CREDIT_COST = 15

  // ---- Voice recording state ----
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [voiceRecordingId, setVoiceRecordingId] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const baseTextRef = useRef('')
  const mimeTypeRef = useRef('audio/webm')
  const isStoppingRef = useRef(false)
  const transcriptionInFlightRef = useRef(false)
  const recordingStartTimeRef = useRef(0)

  // Keep a ref to the latest ideaText so callbacks always see current value
  const ideaTextRef = useRef(ideaText)
  useEffect(() => { ideaTextRef.current = ideaText }, [ideaText])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Send accumulated audio for interim (live) transcription
  const sendInterimTranscription = useCallback(async (chunks: Blob[], mime: string) => {
    if (transcriptionInFlightRef.current || isStoppingRef.current) return
    const audioBlob = new Blob(chunks, { type: mime })
    if (audioBlob.size < 1000) return

    transcriptionInFlightRef.current = true
    try {
      const formData = new FormData()
      const ext = mime.includes('webm') ? 'webm' : 'ogg'
      formData.append('audio', audioBlob, `voice-chunk.${ext}`)

      const resp = await fetch('/api/transcribe?interim=true', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (resp.ok && !isStoppingRef.current) {
        const data = await resp.json()
        if (data.transcript) {
          const base = baseTextRef.current
          const sep = base.trim() ? '\n\n' : ''
          setIdeaText(base + sep + data.transcript)
        }
      }
    } catch {
      // Silently fail for interim; next chunk will retry
    } finally {
      transcriptionInFlightRef.current = false
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      isStoppingRef.current = false
      baseTextRef.current = ideaTextRef.current
      recordingStartTimeRef.current = Date.now()

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg'
      mimeTypeRef.current = mimeType

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
        // Fire interim transcription with all accumulated chunks
        if (!isStoppingRef.current) {
          const snapshot = [...audioChunksRef.current]
          sendInterimTranscription(snapshot, mimeType)
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      // Collect data every 3.5 seconds for live transcription feel
      mediaRecorder.start(3500)
      setIsRecording(true)
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings and try again.')
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.')
      } else {
        setError('Could not start recording: ' + (err.message || 'Unknown error'))
      }
    }
  }, [sendInterimTranscription])

  const stopRecording = useCallback(async () => {
    isStoppingRef.current = true

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)

    // Brief delay so the final ondataavailable fires
    await new Promise(resolve => setTimeout(resolve, 500))

    // Send final full audio for definitive transcription + DB save
    if (audioChunksRef.current.length > 0) {
      setIsTranscribing(true)
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current })
        if (audioBlob.size < 1000) {
          setIsTranscribing(false)
          return
        }

        const durationSec = Math.round((Date.now() - recordingStartTimeRef.current) / 1000)
        const formData = new FormData()
        const ext = mimeTypeRef.current.includes('webm') ? 'webm' : 'ogg'
        formData.append('audio', audioBlob, `voice-pitch-idea.${ext}`)
        formData.append('duration', String(durationSec))

        const resp = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })

        if (resp.ok) {
          const data = await resp.json()
          if (data.transcript) {
            const base = baseTextRef.current
            const sep = base.trim() ? '\n\n' : ''
            setIdeaText(base + sep + data.transcript)
            setVoiceRecordingId(data.voiceRecordingId || null)
          }
        } else {
          const data = await resp.json().catch(() => ({}))
          throw new Error(data.message || data.error || 'Transcription failed')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to transcribe audio. Please try again.')
      } finally {
        setIsTranscribing(false)
      }
    }
  }, [])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  useEffect(() => {
    fetch('/api/user/credits', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setCredits(data)
        setError(null)
      })
      .catch(err => console.error('Error loading credits:', err))
  }, [])

  const handleAnalyze = async () => {
    // Validate input
    if (inputMode === 'text' && !ideaText.trim()) {
      setError('Please describe your pitch idea or product concept')
      return
    }
    
    if (inputMode === 'file' && !ideaFile) {
      setError('Please upload a document with your pitch idea')
      return
    }
    
    if (!credits) {
      setError('Loading your credits... Please wait a moment and try again.')
      return
    }
    
    if (!credits.isPremium && (credits.credits ?? 0) < PITCH_IDEA_CREDIT_COST) {
      setError(`Insufficient credits. Pitch idea analysis costs ${PITCH_IDEA_CREDIT_COST} credits. You have ${credits.credits ?? 0} credits. Please purchase credits or upgrade to premium.`)
      return
    }
    
    setAnalyzing(true)
    setError(null)
    
    try {
      // Use FormData to support both text and file uploads
      const formData = new FormData()
      
      if (inputMode === 'file' && ideaFile) {
        formData.append('file', ideaFile)
      } else {
        formData.append('idea', ideaText)
      }
      
      // If a voice recording was used, link it to this analysis
      if (voiceRecordingId) {
        formData.append('voiceRecordingId', voiceRecordingId)
      }
      
      const response = await fetch('/api/analyze-pitch-idea', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text.substring(0, 500))
        throw new Error(`Server error: Received ${contentType || 'unknown'} instead of JSON.`)
      }

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402) {
          // Create detailed error message for credits
          let errorMessage = data.error || 'Insufficient credits'
          if (data.whatWentWrong || data.howToFix) {
            errorMessage = `${errorMessage}\n\n${data.whatWentWrong || ''}\n\nWhy: ${data.whyItFailed || ''}\n\nHow to fix:\n${(data.howToFix || []).map((fix: string, i: number) => `${i + 1}. ${fix}`).join('\n')}`
          }
          setError(errorMessage)
          const creditsRes = await fetch('/api/user/credits', { credentials: 'include' })
          if (creditsRes.ok) {
            const creditsData = await creditsRes.json()
            setCredits(creditsData)
          }
          setAnalyzing(false)
          return
        }
        
        // Create detailed error message
        let errorMessage = data.error || data.message || 'Failed to analyze pitch idea'
        if (data.whatWentWrong || data.howToFix) {
          errorMessage = `${errorMessage}\n\n${data.whatWentWrong || ''}\n\nWhy: ${data.whyItFailed || ''}\n\nHow to fix:\n${(data.howToFix || []).map((fix: string, i: number) => `${i + 1}. ${fix}`).join('\n')}`
        }
        throw new Error(errorMessage)
      }

      setResult(data)
      
      const creditsRes = await fetch('/api/user/credits', { credentials: 'include' })
      if (creditsRes.ok) {
        const creditsData = await creditsRes.json()
        setCredits(creditsData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze pitch idea. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleGetFounderFeedback = async () => {
    if (!result) return
    
    setRequestingFeedback(true)
    try {
      const response = await fetch('/api/founder-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          analysisId: result.id,
          idea: ideaText 
        }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402) {
          alert('Insufficient credits. Founder feedback costs 200 credits.')
          return
        }
        throw new Error(data.error || 'Failed to get founder feedback')
      }

      setResult({ ...result, founderFeedback: data.feedback })
      
      const creditsRes = await fetch('/api/user/credits', { credentials: 'include' })
      if (creditsRes.ok) {
        const creditsData = await creditsRes.json()
        setCredits(creditsData)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to get founder feedback')
    } finally {
      setRequestingFeedback(false)
    }
  }

  if (result) {
    const analysis = result.analysis || {}
    const matches = result.matches || []
    
    return (
      <div className="space-y-6">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  Analysis Complete
                </CardTitle>
                <CardDescription className="mt-2">
                  Your pitch idea has been analyzed using patterns from real investor feedback
                </CardDescription>
              </div>
              <Button onClick={() => {
                setResult(null)
                setIdeaText('')
                setIdeaFile(null)
                setInputMode('text')
              }} variant="outline">
                Analyze Another
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Founder Feedback CTA */}
        {!result.founderFeedback && (
          <Card className="border-2 border-purple-500/30 bg-purple-500/10/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Get Feedback from YC-Funded Founders</h3>
                  <p className="text-sm text-muted-foreground mb-1">Get personalized feedback from Inigo & William (YC-backed founders)</p>
                  <p className="text-xs text-slate-500">Improve your score and get actionable advice from real investors</p>
                </div>
                <Button 
                  onClick={handleGetFounderFeedback}
                  disabled={requestingFeedback || !credits || (!credits.isPremium && (credits.credits ?? 0) < 200)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  {requestingFeedback ? 'Requesting...' : 'Get Feedback (200 credits)'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Founder Feedback Results */}
        {result.founderFeedback && (
          <Card className="border-2 border-purple-500/35 bg-gradient-to-br from-purple-500/12 to-pink-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-600" />
                Feedback from YC-Funded Founders
              </CardTitle>
              <CardDescription>Personalized advice from Inigo & William</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-foreground/85">{result.founderFeedback}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rubric Analysis Dashboard */}
        {analysis.rubricAnalysis && (
          <AnalysisDashboard result={analysis.rubricAnalysis} />
        )}

        {/* Smart Match Results */}
        {result.smartMatches && result.smartMatches.length > 0 && (
          <SmartMatchResults matches={result.smartMatches} />
        )}

        {/* Analysis Results (fallback when no rubric) */}
        {!analysis.rubricAnalysis && (
        <div className="grid md:grid-cols-3 gap-4">
          {analysis.strengths && analysis.strengths.length > 0 && (
            <Card className="border-2 border-emerald-500/30 bg-emerald-500/10/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  {analysis.strengths.slice(0, 4).map((strength: string, i: number) => (
                    <li key={i} className="text-muted-foreground">• {strength}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {analysis.improvements && analysis.improvements.length > 0 && (
            <Card className="border-2 border-orange-500/30 bg-orange-500/8">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-orange-600" />
                  Improvements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  {analysis.improvements.slice(0, 4).map((improvement: string, i: number) => (
                    <li key={i} className="text-muted-foreground">• {improvement}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {analysis.suggestions && analysis.suggestions.length > 0 && (
            <Card className="border-2 border-primary/25 bg-primary/10">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  {analysis.suggestions.slice(0, 4).map((suggestion: string, i: number) => (
                    <li key={i} className="text-muted-foreground">• {suggestion}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
        )}

        {/* VC Matches */}
        {matches.length > 0 && (
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <Target className="h-6 w-6 text-primary" />
                    Recommended VCs
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    {matches.length} VCs that might be interested in your pitch idea
                  </CardDescription>
                </div>
                <Badge className="bg-gradient-to-r from-primary to-blue-600 text-white px-4 py-1.5 text-sm">
                  Matched
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {matches.slice(0, 10).map((match: any, idx: number) => {
                const investor = match.investor || {}
                // Ensure score exists - default to 75 if missing (good match)
                const matchScore = Math.round(match.score ?? match.compatibilityScore ?? 75)
                
                // Determine score color and badge
                const getScoreColor = (score: number) => {
                  if (score >= 85) return 'from-green-500 to-emerald-600'
                  if (score >= 75) return 'from-blue-500 to-blue-600'
                  if (score >= 65) return 'from-purple-500 to-purple-600'
                  return 'from-slate-500 to-slate-600'
                }
                
                const getScoreBadge = (score: number) => {
                  if (score >= 85) return { text: 'Excellent Match', color: 'bg-green-100 text-green-700 border-green-300' }
                  if (score >= 75) return { text: 'Strong Match', color: 'bg-blue-100 text-primary border-blue-300' }
                  if (score >= 65) return { text: 'Good Match', color: 'bg-purple-100 text-purple-700 border-purple-500/35' }
                  return { text: 'Potential Match', color: 'bg-muted text-foreground/85 border-border' }
                }
                
                const scoreBadge = getScoreBadge(matchScore)
                
                return (
                  <Card 
                    key={idx} 
                    className={`border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg ${
                      matchScore >= 85 ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-card' :
                      matchScore >= 75 ? 'border-primary/25 bg-gradient-to-br from-primary/10 to-card' :
                      'border-border bg-card'
                    }`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-foreground">{investor.firmName || 'Unknown VC'}</h3>
                            <Badge variant="outline" className={`text-xs font-semibold ${scoreBadge.color}`}>
                              {scoreBadge.text}
                            </Badge>
                            {match.livePulse && match.livePulse.signalStrength > 1 && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                              </span>
                            )}
                            {match.livePulse && match.livePulse.signalStrength <= 1 && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">
                                Potentially Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {investor.fundType || 'VC'} • ${investor.checkMin || 0}K - ${investor.checkMax || 0}K
                          </p>
                          {investor.bio && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{investor.bio.substring(0, 120)}...</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className={`text-4xl font-bold bg-gradient-to-r ${getScoreColor(matchScore)} bg-clip-text text-transparent`}>
                            {matchScore}
                          </div>
                          <div className="text-xs font-medium text-muted-foreground mt-1">Match Score</div>
                          <div className="mt-2">
                            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${getScoreColor(matchScore)} transition-all`}
                                style={{ width: `${matchScore}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3 mt-4 pt-4 border-t border-border">
                        <div>
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground/85">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Why This Match?
                          </h4>
                          {match.detailedReasons && match.detailedReasons.length > 0 ? (
                            <ul className="space-y-2.5">
                              {match.detailedReasons.slice(0, 4).map((detail: any, i: number) => (
                                <li key={i} className="text-sm">
                                  <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                    {detail.score > 0 ? (
                                      <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                                    ) : (
                                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-orange-500" />
                                    )}
                                    <div className="flex-1">
                                      <div className="font-semibold text-slate-800">{detail.category}</div>
                                      <div className="text-xs text-muted-foreground mt-0.5">{detail.explanation}</div>
                                      {detail.evidence && detail.evidence.length > 0 && (
                                        <div className="text-xs text-slate-500 mt-1.5 italic flex items-center gap-1">
                                          <TrendingUp className="h-3 w-3" />
                                          {detail.evidence.slice(0, 2).join(' • ')}
                                        </div>
                                      )}
                                    </div>
                                    {detail.score !== undefined && (
                                      <div className={`text-xs font-bold px-2 py-0.5 rounded ${
                                        detail.score > 0 
                                          ? 'bg-green-100 text-green-700' 
                                          : 'bg-orange-100 text-orange-700'
                                      }`}>
                                        {detail.score > 0 ? '+' : ''}{detail.score}
                                      </div>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <ul className="space-y-2">
                              {(match.reasons || []).slice(0, 4).map((reason: string, i: number) => (
                                <li key={i} className="text-sm text-foreground/85 flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                                  <span>{reason}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        
                        {match.livePulse?.summary && (
                          <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/10 border border-primary/25 space-y-1.5">
                            <h5 className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                              <TrendingUp className="h-3 w-3" />
                              Live VC Intelligence
                            </h5>
                            {match.livePulse.summary.recentPortfolio && (
                              <p className="text-xs text-foreground/85">{match.livePulse.summary.recentPortfolio}</p>
                            )}
                            {match.livePulse.summary.currentHeat && (
                              <p className="text-xs text-foreground/85">{match.livePulse.summary.currentHeat}</p>
                            )}
                            {match.livePulse.summary.founderAlignment && (
                              <p className="text-xs text-foreground/85">{match.livePulse.summary.founderAlignment}</p>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <a 
                            href={investor.applicationUrl || investor.websiteUrl || `mailto:${investor.email}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex-1"
                          >
                            <Button className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-sm hover:shadow-md transition-all font-semibold">
                              Apply Now
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </Button>
                          </a>
                          <Button variant="outline" size="sm" className="border-2">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="mx-auto max-w-4xl w-full border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Pitch Idea Analysis
          </CardTitle>
          <CardDescription className="text-base">
            Get feedback on your pitch idea grounded in what real investors look for
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-card/60 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-sm">Real Investor Insights</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Modeled on feedback from real VCs and investors. See the same signals they care about.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-card/60 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-sm">Actionable Improvements</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Specific suggestions to strengthen your pitch and make it more compelling to investors.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-card/60 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-sm">VC Recommendations</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                See which VCs might be interested in your idea based on their investment thesis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mx-auto max-w-4xl w-full">
        <CardHeader>
          <CardTitle>Share Your Pitch Idea</CardTitle>
          <CardDescription>
            Type your idea directly or upload a document. We'll analyze it and give you feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Mode Toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => {
                setInputMode('text')
                setIdeaFile(null)
                setError(null)
              }}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                inputMode === 'text'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              disabled={analyzing}
            >
              <FileText className="inline-block w-4 h-4 mr-2" />
              Type Text
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('file')
                setIdeaText('')
                setError(null)
              }}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                inputMode === 'file'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              disabled={analyzing}
            >
              <Upload className="inline-block w-4 h-4 mr-2" />
              Upload Document
            </button>
          </div>

          {/* Text Input */}
          {inputMode === 'text' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="idea">Your Pitch Idea or Product Concept *</Label>
                <div className="flex items-center gap-2">
                  {isTranscribing && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Finalizing...
                    </span>
                  )}
                  {voiceRecordingId && !isRecording && !isTranscribing && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Saved
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={analyzing || isTranscribing}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      isRecording
                        ? 'bg-primary text-white shadow-lg shadow-primary/40 scale-110'
                        : 'bg-muted hover:bg-primary/10 text-slate-500 hover:text-primary'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={isRecording ? 'Click to stop' : 'Click to speak your idea'}
                  >
                    <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
              </div>
              <textarea
                id="idea"
                value={ideaText}
                onChange={(e) => {
                  setIdeaText(e.target.value)
                  setError(null)
                }}
                placeholder="Describe your startup idea, product concept, or pitch. What problem are you solving? Who is your target market? What makes your solution unique?&#10;&#10;💡 Tip: Click the mic button to dictate your idea using your voice."
                className={`flex min-h-[200px] w-full rounded-xl border-2 ${
                  isRecording
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border focus:border-primary bg-background'
                } px-4 py-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all`}
                required
                disabled={analyzing}
              />
              <p className="text-xs text-muted-foreground">
                Be specific about your idea, target market, and what makes it unique. The more detail, the better the feedback.
              </p>
            </div>
          )}

          {/* File Upload */}
          {inputMode === 'file' && (
            <div className="space-y-2">
              <Label htmlFor="idea-file">Upload Your Pitch Document *</Label>
              <div className="flex flex-col gap-3">
                <div
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all ${
                    ideaFile
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 bg-muted/40'
                  }`}
                >
                  {ideaFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-8 h-8 text-primary" />
                      <p className="text-sm font-medium text-foreground">{ideaFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(ideaFile.size / 1024).toFixed(1)} KB
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIdeaFile(null)
                          setError(null)
                        }}
                        disabled={analyzing}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor="idea-file" className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-sm font-medium text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, DOCX, DOC, or TXT (max 10MB)
                      </p>
                    </label>
                  )}
                </div>
                <input
                  id="idea-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        setError('File size must be less than 10MB')
                        return
                      }
                      setIdeaFile(file)
                      setError(null)
                    }
                  }}
                  className="hidden"
                  disabled={analyzing}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a document containing your pitch idea, business plan, or product description.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-sm text-red-700">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="font-semibold text-base mb-1">Error</div>
                  <div className="text-red-800">{error.split('\n\n')[0]}</div>
                </div>
              </div>
              
              {error.includes('What went wrong:') && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <div className="font-semibold mb-1">What went wrong:</div>
                  <div className="text-red-700 mb-3">{error.split('What went wrong:')[1]?.split('Why:')[0]?.trim()}</div>
                  
                  {error.includes('Why:') && (
                    <>
                      <div className="font-semibold mb-1">Why it failed:</div>
                      <div className="text-red-700 mb-3">{error.split('Why:')[1]?.split('How to fix:')[0]?.trim()}</div>
                    </>
                  )}
                  
                  {error.includes('How to fix:') && (
                    <>
                      <div className="font-semibold mb-2">How to fix:</div>
                      <ul className="list-decimal list-inside space-y-1 text-red-700">
                        {error.split('How to fix:')[1]?.split('\n').filter((line: string) => line.trim().match(/^\d+\./)).map((line: string, i: number) => (
                          <li key={i}>{line.trim().replace(/^\d+\.\s*/, '')}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Pitch Idea Analysis
                </div>
                <div className="text-muted-foreground">
                  Cost: {PITCH_IDEA_CREDIT_COST} credits
                  {credits && (
                    <span className="ml-2">
                      • You have: <span className="font-semibold text-foreground">{credits.credits ?? 0}</span> credits
                      {credits.isPremium && <Badge variant="secondary" className="ml-2 text-xs">Premium</Badge>}
                    </span>
                  )}
                </div>
              </div>
              {credits && (!credits.isPremium && (credits.credits ?? 0) < PITCH_IDEA_CREDIT_COST) && (
                <Link href="/pricing">
                  <Button variant="outline" size="sm">
                    Buy Credits
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <Button 
            onClick={handleAnalyze} 
            disabled={
              (inputMode === 'text' && !ideaText.trim()) ||
              (inputMode === 'file' && !ideaFile) ||
              analyzing || 
              !credits || 
              (!credits.isPremium && (credits.credits ?? 0) < PITCH_IDEA_CREDIT_COST)
            }
            className="w-full"
            size="lg"
          >
            {analyzing ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : !credits ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Loading credits...
              </>
            ) : (
              <>
                <Lightbulb className="mr-2 h-4 w-4" />
                Analyze Pitch Idea
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

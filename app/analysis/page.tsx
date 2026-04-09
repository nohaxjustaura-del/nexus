'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InvestorMatch {
  id: string;
  firmName: string;
  fundType: string;
  stages: string[];
  sectors: string[];
  checkSizeMin: number;
  checkSizeMax: number;
  geography: string[];
  thesis?: string;
  bio: string;
  website?: string;
  email?: string;
  matchScore: number;
  matchReasons: string[];
  pitchAdaptation: string;
  whyThisInvestor: string;
  keyTalkingPoints: string[];
}

interface CoachFeedback {
  overallAssessment: string;
  strengths: string[];
  weaknesses: string[];
  pitchImprovements: string[];
  deckFeedback: string[];
  fundraisingStrategy: string[];
  competitivePositioning: string;
  marketOpportunity: string;
  teamAssessment: string;
  tractionAnalysis: string;
  topMatches: InvestorMatch[];
}

export default function AnalysisPage() {
  const [feedback, setFeedback] = useState<CoachFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorMatch | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pitch' | 'matching'>('overview');

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const assessmentParagraphs = useMemo(() => {
    const raw = feedback?.overallAssessment
    if (!raw) return [] as string[]
    return raw
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)
  }, [feedback?.overallAssessment])

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analysis');
      if (response.ok) {
        const data = await response.json();
        setFeedback(data);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/50 via-primary/5 to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-lg text-muted-foreground">Analyzing your startup...</p>
          <p className="text-sm text-muted-foreground/70 mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/50 via-primary/5 to-primary/10 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">No Analysis Found</h2>
          <p className="text-muted-foreground mb-6">Complete the onboarding questionnaire to get your personalized analysis.</p>
          <Link
            href="/onboarding/founder"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Start Onboarding
          </Link>
        </div>
      </div>
    );
  }

  const assessmentLead = assessmentParagraphs[0] ?? ''
  const assessmentRest = assessmentParagraphs.slice(1)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 shadow-sm backdrop-blur-sm">
        <div className="page-shell-narrow py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                {BRAND_NAME} analysis
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">Fundraising roadmap from your onboarding answers</p>
            </div>
            <Link
              href="/onboarding/founder"
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Update Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-card/60">
        <div className="page-shell-narrow">
          <div className="flex flex-wrap gap-2 sm:gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={cn(
                'border-b-2 py-3 px-1 text-sm font-medium transition-colors',
                activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pitch')}
              className={cn(
                'border-b-2 py-3 px-1 text-sm font-medium transition-colors',
                activeTab === 'pitch'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              Pitch and strategy
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('matching')}
              className={cn(
                'border-b-2 py-3 px-1 text-sm font-medium transition-colors',
                activeTab === 'matching'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              Matches ({feedback.topMatches.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="page-shell-narrow py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Overall Assessment */}
            <div className="surface-panel p-6">
              <h2 className="font-heading text-xl font-semibold text-foreground">Overall assessment</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{assessmentLead}</p>
              {assessmentRest.length > 0 ? (
                <Accordion type="single" collapsible className="mt-4 rounded-lg border border-border/50">
                  <AccordionItem value="full-assessment" className="border-0">
                    <AccordionTrigger className="py-3 text-sm hover:no-underline">
                      Read full assessment
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="prose prose-sm max-w-none pb-2 text-muted-foreground">
                        {assessmentRest.map((paragraph, idx) => (
                          <p key={idx} className="mb-3 last:mb-0">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ) : null}
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Strengths */}
              <div className="surface-panel p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-green-500/15 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Key Strengths</h3>
                </div>
                <ul className="space-y-3">
                  {feedback.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-muted-foreground">
                      <span className="text-green-500 mt-1">✓</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="surface-panel p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-amber-500/15 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Areas to Improve</h3>
                </div>
                <ul className="space-y-3">
                  {feedback.weaknesses.map((weakness, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-muted-foreground">
                      <span className="text-amber-500 mt-1">⚠</span>
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Accordion type="multiple" className="rounded-xl border border-border/50 bg-card/40 px-2">
              <DetailAccordionItem value="team" title="Team assessment" content={feedback.teamAssessment} />
              <DetailAccordionItem value="traction" title="Traction analysis" content={feedback.tractionAnalysis} />
              <DetailAccordionItem value="market" title="Market opportunity" content={feedback.marketOpportunity} />
              <DetailAccordionItem value="competitive" title="Competitive positioning" content={feedback.competitivePositioning} />
            </Accordion>
          </div>
        )}

        {activeTab === 'pitch' && (
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="pitch-improvements" className="surface-panel border-0 px-4">
              <AccordionTrigger className="py-4 text-left font-heading text-lg font-semibold hover:no-underline">
                Pitch improvements
              </AccordionTrigger>
              <AccordionContent>
                <p className="mb-4 text-sm text-muted-foreground">Recommendations to strengthen your narrative:</p>
                <div className="space-y-3 pb-2">
                  {feedback.pitchImprovements.map((improvement, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/10 p-4"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {idx + 1}
                      </div>
                      <p className="flex-1 text-sm text-foreground/90">{improvement}</p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="deck" className="surface-panel border-0 px-4">
              <AccordionTrigger className="py-4 text-left font-heading text-lg font-semibold hover:no-underline">
                Pitch deck feedback
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 pb-2 text-sm text-muted-foreground">
                  {feedback.deckFeedback.map((item, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="strategy" className="surface-panel border-0 px-4">
              <AccordionTrigger className="py-4 text-left font-heading text-lg font-semibold hover:no-underline">
                Fundraising strategy
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 pb-2 text-sm text-muted-foreground">
                  {feedback.fundraisingStrategy.map((item, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {activeTab === 'matching' && (
          <div className="space-y-6">
            <div className="surface-panel p-6">
              <h2 className="font-heading text-xl font-semibold text-foreground">Your investor matches</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {feedback.topMatches.length} investors aligned with your profile. Open a card for pitch angles and talking
                points.
              </p>
            </div>

            <Collapsible className="group/legend rounded-lg border border-border/50 bg-muted/20 px-4">
              <CollapsibleTrigger className="flex w-full items-center justify-between py-3 text-sm font-medium text-foreground">
                <span>How to read match scores</span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/legend:rotate-180"
                  aria-hidden
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-col gap-2 pb-4 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-6">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> 80–100 excellent
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> 60–79 good
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> 40–59 moderate
                  </span>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Investor Matches */}
            <div className="grid gap-6">
              {feedback.topMatches.map((match, idx) => (
                <div key={match.id} className="surface-panel p-6 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg flex items-center justify-center text-xl font-bold">
                        #{idx + 1}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{match.firmName}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="px-2 py-1 bg-muted rounded">{match.fundType}</span>
                          <span>{match.stages.join(', ')}</span>
                          <span>•</span>
                          <span>${(match.checkSizeMin / 1000).toFixed(0)}K - ${(match.checkSizeMax / 1000000).toFixed(1)}M</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${
                        match.matchScore >= 80 ? 'text-green-600' :
                        match.matchScore >= 60 ? 'text-blue-600' :
                        'text-yellow-600'
                      }`}>
                        {match.matchScore}
                      </span>
                      <span className="text-sm text-muted-foreground/70">/ 100</span>
                    </div>
                  </div>

                  {/* Match Reasons */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-foreground mb-2">Why This Investor:</h4>
                    <ul className="space-y-1">
                      {match.matchReasons.map((reason, ridx) => (
                        <li key={ridx} className="text-sm text-muted-foreground">{reason}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Toggle Details */}
                  <button
                    onClick={() => setSelectedInvestor(selectedInvestor?.id === match.id ? null : match)}
                    className="w-full mt-4 py-2 px-4 bg-primary/10 hover:bg-primary/18 text-primary font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {selectedInvestor?.id === match.id ? 'Hide' : 'Show'} Detailed Strategy
                    <svg
                      className={`w-5 h-5 transition-transform ${selectedInvestor?.id === match.id ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Detailed Strategy (Expandable) */}
                  {selectedInvestor?.id === match.id && (
                    <div className="mt-6 space-y-6 pt-6 border-t border-border">
                      {/* Why This Investor */}
                      <div>
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <span className="text-xl">🎯</span>
                          Strategic Fit
                        </h4>
                        <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted/50 p-4 rounded-lg">
                          {match.whyThisInvestor}
                        </div>
                      </div>

                      {/* Pitch Adaptation */}
                      <div>
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <span className="text-xl">📝</span>
                          How to Adapt Your Pitch
                        </h4>
                        <div className="text-sm text-muted-foreground whitespace-pre-line bg-primary/10 p-4 rounded-lg border border-primary/20">
                          {match.pitchAdaptation}
                        </div>
                      </div>

                      {/* Key Talking Points */}
                      <div>
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <span className="text-xl">💬</span>
                          Key Talking Points
                        </h4>
                        <ul className="space-y-2">
                          {match.keyTalkingPoints.map((point, pidx) => (
                            <li key={pidx} className="flex items-start gap-3 text-sm text-muted-foreground bg-purple-500/10 p-3 rounded-lg">
                              <span className="text-purple-500 mt-0.5">→</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Contact Info */}
                      <div className="flex items-center gap-4 pt-4 border-t border-border">
                        {match.website && (
                          <a
                            href={match.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                            Visit Website
                          </a>
                        )}
                        {match.email && (
                          <a
                            href={`mailto:${match.email}`}
                            className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Send Email
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {feedback.topMatches.length === 0 && (
              <div className="surface-panel p-12 text-center">
                <p className="text-muted-foreground">No matches found. Try updating your profile with more details.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DetailAccordionItem({ value, title, content }: { value: string; title: string; content: string }) {
  return (
    <AccordionItem value={value} className="border-b border-border/40 last:border-b-0">
      <AccordionTrigger className="py-4 text-left font-heading text-base font-semibold hover:no-underline sm:text-lg">
        {title}
      </AccordionTrigger>
      <AccordionContent>
        <div className="prose prose-sm max-w-none whitespace-pre-line pb-4 text-muted-foreground leading-relaxed">{content}</div>
      </AccordionContent>
    </AccordionItem>
  )
}



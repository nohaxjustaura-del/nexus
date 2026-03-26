'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-lg text-gray-600">Analyzing your startup...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/50 via-primary/5 to-primary/10 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Analysis Found</h2>
          <p className="text-gray-600 mb-6">Complete the onboarding questionnaire to get your personalized analysis.</p>
          <Link
            href="/onboarding/founder"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Start Onboarding
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/50 via-primary/5 to-primary/10">
      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cursor Fund Coach Analysis</h1>
              <p className="text-gray-600 mt-1">Your personalized fundraising roadmap</p>
            </div>
            <Link
              href="/onboarding/founder"
              className="text-blue-600 hover:text-primary font-medium flex items-center gap-2"
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
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-muted-foreground hover:border-gray-300'
              }`}
            >
              Overview & Assessment
            </button>
            <button
              onClick={() => setActiveTab('pitch')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pitch'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-muted-foreground hover:border-gray-300'
              }`}
            >
              Pitch & Strategy
            </button>
            <button
              onClick={() => setActiveTab('matching')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'matching'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-muted-foreground hover:border-gray-300'
              }`}
            >
              Investor Matches ({feedback.topMatches.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Overall Assessment */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Overall Assessment</h2>
              <div className="prose max-w-none text-muted-foreground leading-relaxed">
                {feedback.overallAssessment.split('\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-3">{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Key Strengths</h3>
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
              <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Areas to Improve</h3>
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

            {/* Deep Dive Sections */}
            <div className="space-y-6">
              <DetailSection title="Team Assessment" content={feedback.teamAssessment} />
              <DetailSection title="Traction Analysis" content={feedback.tractionAnalysis} />
              <DetailSection title="Market Opportunity" content={feedback.marketOpportunity} />
              <DetailSection title="Competitive Positioning" content={feedback.competitivePositioning} />
            </div>
          </div>
        )}

        {activeTab === 'pitch' && (
          <div className="space-y-6">
            {/* Pitch Improvements */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Pitch Improvements</h2>
              <p className="text-gray-600 mb-6">Specific recommendations to strengthen your pitch narrative:</p>
              <div className="space-y-4">
                {feedback.pitchImprovements.map((improvement, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </div>
                    <p className="text-gray-800 flex-1">{improvement}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Deck Feedback */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Pitch Deck Feedback</h2>
              <p className="text-gray-600 mb-6">How to create or improve your investor deck:</p>
              <div className="space-y-3">
                {feedback.deckFeedback.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-muted-foreground">
                    <span className="text-indigo-500 mt-1">📊</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fundraising Strategy */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Fundraising Strategy</h2>
              <p className="text-gray-600 mb-6">Tactical playbook for running your fundraise:</p>
              <div className="space-y-3">
                {feedback.fundraisingStrategy.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-muted-foreground">
                    <span className="text-purple-500 mt-1">💡</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matching' && (
          <div className="space-y-6">
            {/* Matching Overview */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Top Investor Matches</h2>
              <p className="text-gray-600">
                We've analyzed {feedback.topMatches.length} investors that align with your startup profile.
                Each match includes a personalized pitch adaptation and outreach strategy.
              </p>
            </div>

            {/* Match Score Legend */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/10 rounded-lg p-4 border border-primary/20">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">Match Score:</span>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-600">80-100: Excellent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600">60-79: Good</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-gray-600">40-59: Moderate</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Investor Matches */}
            <div className="grid gap-6">
              {feedback.topMatches.map((match, idx) => (
                <div key={match.id} className="bg-card rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg flex items-center justify-center text-xl font-bold">
                        #{idx + 1}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{match.firmName}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-gray-100 rounded">{match.fundType}</span>
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
                      <span className="text-sm text-gray-500">/ 100</span>
                    </div>
                  </div>

                  {/* Match Reasons */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Why This Investor:</h4>
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
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="text-xl">🎯</span>
                          Strategic Fit
                        </h4>
                        <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted/50 p-4 rounded-lg">
                          {match.whyThisInvestor}
                        </div>
                      </div>

                      {/* Pitch Adaptation */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <span className="text-xl">📝</span>
                          How to Adapt Your Pitch
                        </h4>
                        <div className="text-sm text-muted-foreground whitespace-pre-line bg-primary/10 p-4 rounded-lg border border-primary/20">
                          {match.pitchAdaptation}
                        </div>
                      </div>

                      {/* Key Talking Points */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
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
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-muted-foreground rounded-lg hover:bg-gray-200 transition-colors"
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
              <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
                <p className="text-gray-600">No matches found. Try updating your profile with more details.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailSection({ title, content }: { title: string; content: string }) {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
      <div className="prose max-w-none text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
        {content}
      </div>
    </div>
  );
}



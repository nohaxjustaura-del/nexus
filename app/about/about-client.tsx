'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Target,
  Users,
  Zap,
  Shield,
  TrendingUp,
  Search,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'

export default function AboutClient({ verifiedInvestorCountLabel }: { verifiedInvestorCountLabel: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white text-slate-800">
      <div className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
        {/* Hero */}
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-blue-700">{BRAND_TAGLINE}</p>
          <h1 className="mb-4 bg-gradient-to-r from-blue-900 via-blue-700 to-blue-600 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            About {BRAND_NAME}
          </h1>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-slate-600">
            {BRAND_NAME} analyzes your pitch idea, deck, or video and builds a ranked shortlist of aligned investors from
            our verified directory, so you focus on conversations that fit your stage, sector, and story, not endless
            list-building. The live directory includes{' '}
            <span className="font-semibold text-slate-900">{verifiedInvestorCountLabel} verified investor profiles</span>{' '}
            we use for matching and discovery.
          </p>
        </div>

        {/* Mission */}
        <Card className="mb-12 border border-blue-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl text-slate-900">
              <Target className="h-6 w-6 text-blue-600" aria-hidden />
              Our mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg leading-relaxed text-slate-600">
              Fundraising is noisy: huge directories, weak overlap, and outreach that does not convert. {BRAND_NAME}{' '}
              reviews what you share in an allocator-style lens, then ranks investors by mandate fit so you spend time on
              credible outreach, not spray-and-pray volume. We surface matches and rationale; warm intros and closes remain
              yours to earn.
            </p>
          </CardContent>
        </Card>

        {/* What we do */}
        <div className="mb-12">
          <h2 className="mb-8 text-center text-3xl font-bold text-slate-900">What we do</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border border-blue-100 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800">
                  <Sparkles className="h-6 w-6 text-white" aria-hidden />
                </div>
                <CardTitle className="text-slate-900">Pitch analysis</CardTitle>
                <CardDescription className="text-slate-600">
                  Structured feedback on materials you submit in the app
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    <span>
                      <strong className="text-slate-800">Pitch idea:</strong> Stress-test the concept with concise,
                      investor-style commentary
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    <span>
                      <strong className="text-slate-800">Pitch deck:</strong> Slide-level notes and messaging suggestions
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    <span>
                      <strong className="text-slate-800">Video pitch:</strong> Feedback on clarity, delivery, and
                      narrative (some flows may complete asynchronously by email)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    <span>
                      <strong className="text-slate-800">Resume:</strong> Separate founder resume analysis for team and
                      traction context; see{' '}
                      <Link href="/founder/resume-analysis" className="font-medium text-blue-700 underline-offset-2 hover:underline">
                        Resume analysis
                      </Link>
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border border-blue-100 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800">
                  <Target className="h-6 w-6 text-white" aria-hidden />
                </div>
                <CardTitle className="text-slate-900">Investor matching</CardTitle>
                <CardDescription className="text-slate-600">
                  Ranked shortlists with explicit fit rationale
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    <span>Weights stage, sector, vision, and how you operate</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    <span>
                      Draws on <strong className="text-slate-800">{verifiedInvestorCountLabel} verified investors</strong>{' '}
                      in our maintained dataset
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    <span>Talking points tailored to names on your shortlist</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    <span>Inspectable scores: transparent inputs and reasoning where the UI exposes them</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border border-blue-100 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800">
                  <Search className="h-6 w-6 text-white" aria-hidden />
                </div>
                <CardTitle className="text-slate-900">Discovery</CardTitle>
                <CardDescription className="text-slate-600">Browse and filter the investor directory</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    <span>Filter by stage, sector, check size, geography, and more</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    <span>Read criteria, focus, and context on each profile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    <span>Bookmark investors for follow-up</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                    <span>Recommendations informed by your founder profile where available</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Key features */}
        <div className="mb-12">
          <h2 className="mb-8 text-center text-3xl font-bold text-slate-900">Principles</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border border-blue-100 bg-white shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <Shield className="h-5 w-5 text-blue-700" aria-hidden />
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-900">Privacy-conscious</h3>
                    <p className="text-slate-600">
                      We treat decks and personal data carefully and do not share them without your consent. As noted in
                      the product, uploaded analysis content is automatically removed after 30–90 days per retention
                      settings.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-blue-100 bg-white shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <Zap className="h-5 w-5 text-blue-700" aria-hidden />
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-900">Faster shortlisting</h3>
                    <p className="text-slate-600">
                      Generate a ranked list in minutes instead of weeks of manual spreadsheet work, then prioritize who
                      to research and contact first.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-blue-100 bg-white shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <TrendingUp className="h-5 w-5 text-blue-700" aria-hidden />
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-900">Grounded profiles</h3>
                    <p className="text-slate-600">
                      Investor signals draw on structured fields (stages, sectors, thesis, check size, geography), not
                      generic startup buzzwords alone.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-blue-100 bg-white shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <Users className="h-5 w-5 text-blue-700" aria-hidden />
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-900">Broad directory</h3>
                    <p className="text-slate-600">
                      Explore funds, angels, and programs across regions using filters that match how founders actually
                      search for capital.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-12">
          <h2 className="mb-8 text-center text-3xl font-bold text-slate-900">How it works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border border-blue-100 bg-white text-center shadow-sm">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-blue-900">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <CardTitle className="text-slate-900">Share materials</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Upload a deck or video, paste a short idea, or complete onboarding so we can infer your company
                  profile. You receive structured feedback and a profile used for matching.
                </p>
              </CardContent>
            </Card>
            <Card className="border border-blue-100 bg-white text-center shadow-sm">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-blue-900">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <CardTitle className="text-slate-900">Review matches</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  See ranked investors with scores and notes per name, not a flat export, so you understand why each
                  suggestion appears.
                </p>
              </CardContent>
            </Card>
            <Card className="border border-blue-100 bg-white text-center shadow-sm">
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-blue-900">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <CardTitle className="text-slate-900">Outreach & iterate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Bookmark priorities, open applications or emails on your side, and refine your narrative as the round
                  evolves. {BRAND_NAME} does not send introductions on your behalf.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats */}
        <Card className="mb-12 border border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-sm">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
              <div>
                <div className="mb-2 text-3xl font-bold text-blue-900 md:text-4xl">{verifiedInvestorCountLabel}</div>
                <div className="text-sm text-slate-600">Verified investor profiles</div>
              </div>
              <div>
                <div className="mb-2 text-3xl font-bold text-blue-900 md:text-4xl">3+</div>
                <div className="text-sm text-slate-600">Analysis inputs (idea, deck, video)</div>
              </div>
              <div>
                <div className="mb-2 text-3xl font-bold text-blue-900 md:text-4xl">Ranked</div>
                <div className="text-sm text-slate-600">Shortlists by fit</div>
              </div>
              <div>
                <div className="mb-2 text-3xl font-bold text-blue-900 md:text-4xl">Filters</div>
                <div className="text-sm text-slate-600">Stage, sector, check, geo</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-slate-900 md:text-3xl">Ready for a ranked investor shortlist?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-slate-600">
            Create an account, run an analysis, then review matches and discovery in one workflow.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-blue-700 text-white shadow-md hover:bg-blue-800"
              >
                Start free analysis
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            </Link>
            <Link href="/founder/discover">
              <Button size="lg" variant="outline" className="border-2 border-blue-600 text-blue-800 hover:bg-blue-50">
                Browse investors
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

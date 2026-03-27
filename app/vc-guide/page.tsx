import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, Building2, Target, Zap, Globe, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function VCGuidePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container-body px-4 py-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <Badge className="mb-4" variant="secondary">
            <Target className="mr-1 h-3 w-3" />
            How matching works
          </Badge>
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">
            VC Landscape: What Each Type Actually Looks For
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Understanding VC taxonomy helps you target the right investors with the right proof points
          </p>
        </div>

        {/* By Stage */}
        <section className="mb-16">
          <h2 className="mb-6 text-3xl font-bold">By Stage</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  <CardTitle>Pre-Seed / Angel / Scout / Micro-VC</CardTitle>
                </div>
                <CardDescription>Checks: ~$50K–$750K</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="font-semibold text-sm">They Look For:</div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Founder-market fit</strong>: Unique insight or unfair advantage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Speed of execution</strong>: Can you ship fast?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Early proof</strong>: Waitlist signups, prototype, pilot users</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Technical depth</strong>: Can you build this?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Low burn</strong>: Capital efficient path to next milestone</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <CardTitle>Seed</CardTitle>
                </div>
                <CardDescription>Checks: ~$750K–$3M (may lead)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="font-semibold text-sm">They Look For:</div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>PMF trajectory</strong>: Retention (D30/WAU/MAU)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Early revenue</strong>: $5K–$100K MRR or validated pilots</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Repeatable GTM</strong>: Clear hypothesis for customer acquisition</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Credible plan to A</strong>: 18-month roadmap with milestones</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Team completeness</strong>: Key roles filled or hiring plan</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-5 w-5 text-purple-500" />
                  <CardTitle>Series A</CardTitle>
                </div>
                <CardDescription>Checks: ~$5M–$20M (ownership targets 12-20%)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="font-semibold text-sm">They Look For:</div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Repeatable sales</strong>: {'>'}$1-2M ARR for SaaS</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Strong retention</strong>: Net revenue retention {'>'}100%</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Efficient payback</strong>: CAC payback {'<'}18 months</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Hiring plan</strong>: Clear path to build A-player team</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Moat narrative</strong>: Why you win over time</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-5 w-5 text-green-500" />
                  <CardTitle>Growth (B/C+)</CardTitle>
                </div>
                <CardDescription>Checks: $20M+</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="font-semibold text-sm">They Look For:</div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Scale</strong>: {'>'}$10-30M ARR</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Category leadership</strong>: Clear market position</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Best-in-class metrics</strong>: Top quartile in all KPIs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Governance</strong>: Strong board, processes, reporting</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span><strong>Path to profit</strong>: Clear route to profitability</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* By Sector */}
        <section className="mb-16">
          <h2 className="mb-6 text-3xl font-bold">By Sector: Proof Points That Matter</h2>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* AI/ML */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI/ML</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  <li>• Proprietary data or model advantage</li>
                  <li>• Evaluation benchmarks (quality/cost/latency)</li>
                  <li>• Defensibility beyond "we call an API"</li>
                  <li>• Inference cost curves</li>
                  <li>• AI-native UX</li>
                  <li>• Security & privacy controls</li>
                </ul>
              </CardContent>
            </Card>

            {/* Developer Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Developer Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  <li>• Bottoms-up adoption metrics</li>
                  <li>• OSS traction (stars, contributors)</li>
                  <li>• CI/CD integration story</li>
                  <li>• Time-to-value in minutes</li>
                  <li>• Expansion to enterprise</li>
                  <li>• Security posture</li>
                </ul>
              </CardContent>
            </Card>

            {/* Fintech */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fintech</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  <li>• Regulatory strategy (licenses/partners)</li>
                  <li>• Fraud & risk controls</li>
                  <li>• Unit economics</li>
                  <li>• Risk capital requirements</li>
                  <li>• Compliance framework</li>
                  <li>• Banking partnerships</li>
                </ul>
              </CardContent>
            </Card>

            {/* Healthcare */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Healthcare / Biotech</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  <li>• Clinical/regulatory path</li>
                  <li>• Key opinion leaders (KOLs)</li>
                  <li>• Intellectual property (IP)</li>
                  <li>• Milestones (IND, IDE, clinical trials)</li>
                  <li>• Reimbursement strategy</li>
                  <li>• HIPAA compliance</li>
                </ul>
              </CardContent>
            </Card>

            {/* Climate */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Climate / Hardtech</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  <li>• Technology readiness level (TRL)</li>
                  <li>• Pilot sites or LOIs</li>
                  <li>• Capex/opex model</li>
                  <li>• Supply chain risk mitigation</li>
                  <li>• Incentives & tax credits</li>
                  <li>• Carbon impact metrics</li>
                </ul>
              </CardContent>
            </Card>

            {/* Consumer */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Consumer</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  <li>• Retention cohorts (D7, D30)</li>
                  <li>• DAU/MAU & session depth</li>
                  <li>• Content or creator engine</li>
                  <li>• Distribution loops (viral, paid, organic)</li>
                  <li>• Creator/influencer partnerships</li>
                  <li>• Brand differentiation</li>
                </ul>
              </CardContent>
            </Card>

            {/* SaaS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SaaS / B2B</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  <li>• ICP clarity & validation</li>
                  <li>• Pipeline health (volume, velocity)</li>
                  <li>• Sales efficiency (CAC, LTV, payback)</li>
                  <li>• Implementation time</li>
                  <li>• Integration ecosystem</li>
                  <li>• Net revenue retention</li>
                </ul>
              </CardContent>
            </Card>

            {/* Crypto */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Crypto / Web3</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  <li>• On-chain traction (wallets, TVL)</li>
                  <li>• Token plan & compliance</li>
                  <li>• Security audits</li>
                  <li>• Community governance model</li>
                  <li>• Exchange/market maker relationships</li>
                  <li>• Smart contract risk mitigation</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* By Structure */}
        <section className="mb-16">
          <h2 className="mb-6 text-3xl font-bold">By Fund Structure</h2>
          
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Solo GP / Rolling Fund / Emerging Manager</CardTitle>
                <CardDescription>Concentrated bets, strong operator networks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>Look for <strong>crisp founder-story fit</strong> - they bet on people</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>Move <strong>fast on conviction</strong> - often 1-2 meetings to term sheet</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>Provide <strong>deep operator help</strong> - been there, done that</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Multi-Partner Institutional Fund</CardTitle>
                <CardDescription>Process-driven, ownership targets, board capacity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                    <span><strong>Investment committee process</strong> - expect 3-5 meetings</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                    <span><strong>Ownership targets</strong> - typically 15-20% at lead rounds</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                    <span><strong>Board bandwidth</strong> - partner can only take ~8-12 boards</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Corporate VC (CVC)</CardTitle>
                <CardDescription>Strategic fit to parent company</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong>Strategic value</strong> - how you help the corporate parent</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong>BD potential</strong> - can parent be a customer/partner?</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                    <span><strong>Watch for conflicts</strong> - data sharing, competing products</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accelerators / Studios</CardTitle>
                <CardDescription>Cohort-based, intense mentorship</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong>Team coachability</strong> - willingness to learn and iterate</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong>Iteration cadence</strong> - ship weekly, learn constantly</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong>Network leverage</strong> - use the alumni & partner network</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Key Takeaways */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle>💡 Key Takeaway</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              <strong>Scores tie back to what you actually wrote.</strong> We line up sector- and stage-specific
              proof points from your materials so you can see where you are strong and what is still thin.
            </p>
            <p className="text-sm">
              Each match includes the lines and thesis cues that moved the score, not a black-box number, and
              notes on what to tighten before you reach out.
            </p>
            <div className="flex gap-4 mt-6">
              <Link href="/founder/resume-analysis">
                <Button size="lg">
                  Analyze My Resume
                </Button>
              </Link>
              <Link href="/founder/discover">
                <Button size="lg" variant="outline">
                  Browse VCs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


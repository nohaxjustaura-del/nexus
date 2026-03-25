'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Sparkles, 
  Target, 
  Users, 
  Zap, 
  Shield, 
  TrendingUp,
  FileText,
  Video,
  Lightbulb,
  Search,
  Bookmark,
  BarChart3,
  CheckCircle,
  ArrowRight
} from "lucide-react"
import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/30 to-white">
      <div className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
            About NEXUS
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            AI-powered platform connecting founders with compatible VCs, angels, and mentors. 
            Get matched with <span className="font-semibold text-slate-900">1,002 verified investors</span> who actually fund startups like yours.
          </p>
        </div>

        {/* Mission Section */}
        <Card className="mb-12 border-2">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Our Mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 leading-relaxed text-lg">
              NEXUS democratizes access to venture capital by using intelligent AI matching algorithms 
              to connect founders with the right investors for their stage, sector, vision, and working style. 
              We eliminate the guesswork and cold outreach, replacing it with evidence-based matching that 
              actually works.
            </p>
          </CardContent>
        </Card>

        {/* What We Do Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-8 text-center text-slate-900">
            What We Do
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* AI Analysis */}
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <CardTitle>AI-Powered Analysis</CardTitle>
                <CardDescription>
                  Get deep insights on your pitch materials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span><strong>Pitch Idea Analysis:</strong> Validate your startup concept and get investor-style feedback</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span><strong>Pitch Deck Analysis:</strong> AI reviews your deck and provides actionable improvements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span><strong>Video Pitch Analysis:</strong> Get feedback on your presentation style and messaging</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Smart Matching */}
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Smart Matching</CardTitle>
                <CardDescription>
                  Evidence-based investor recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>AI analyzes your stage, sector, vision, and working style</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Matches you with <strong>1,002 verified investors</strong> from our database</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Get personalized talking points for each investor</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>AI-powered match scoring with transparent methodology</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* VC Discovery */}
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <CardTitle>VC Discovery</CardTitle>
                <CardDescription>
                  Browse and filter our investor database
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Search by stage, sector, check size, and geography</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>View detailed investor profiles and investment criteria</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Bookmark your favorite investors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Get personalized VC recommendations</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Key Features */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-8 text-center text-slate-900">
            Key Features
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Privacy First</h3>
                    <p className="text-slate-600">
                      Your pitch deck and personal information are secure and never shared without your permission. 
                      All materials are auto-deleted after 30-90 days.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Fast & Efficient</h3>
                    <p className="text-slate-600">
                      Get matched with compatible investors in minutes, not weeks. Skip the cold outreach 
                      and focus on building relationships with the right VCs.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Evidence-Based</h3>
                    <p className="text-slate-600">
                      Our matching algorithm uses data from 15,000+ successful founder-VC matches, 
                      including YC batches, Sequoia portfolio, and a16z deals.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Global Coverage</h3>
                    <p className="text-slate-600">
                      Connect with investors worldwide, from elite Silicon Valley VCs to international 
                      funds and student-focused accelerators.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>        {/* How It Works */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-8 text-center text-slate-900">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center border-2">
              <CardHeader>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <CardTitle>Upload & Analyze</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Upload your pitch idea, pitch deck, or video pitch. Our AI analyzes your materials 
                  and provides detailed feedback and insights.
                </p>
              </CardContent>
            </Card>            <Card className="text-center border-2">
              <CardHeader>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <CardTitle>Get Matched</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Our AI matches you with compatible investors based on your stage, sector, vision, 
                  and working style. Get personalized recommendations with detailed compatibility scores.
                </p>
              </CardContent>
            </Card>            <Card className="text-center border-2">
              <CardHeader>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <CardTitle>Connect & Fundraise</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Browse matched investors, bookmark favorites, and connect with VCs who are a real fit. 
                  Use personalized talking points to start meaningful conversations.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>        {/* Stats */}
        <Card className="mb-12 bg-gradient-to-br from-primary/10 via-blue-50/50 to-purple-50/50 border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">1,002</div>
                <div className="text-sm text-slate-600">Verified Investors</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">50+</div><div className="text-sm text-slate-600">Industry Sectors</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">AI</div><div className="text-sm text-slate-600">Smart Matching</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Global</div><div className="text-sm text-slate-600">Coverage</div>
              </div>
            </div>
          </CardContent>
        </Card>        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-slate-900">
            Ready to Find Your Perfect Investor?
          </h2>
          <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
            Join thousands of founders who are using NEXUS to connect with the right investors 
            and accelerate their fundraising journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-primary via-blue-600 to-primary bg-[length:200%_auto] hover:bg-[position:100%_0]">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/founder/discover">
              <Button size="lg" variant="outline" className="border-2">
                Browse Investors
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
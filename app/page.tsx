'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Rocket, Zap, Target, Users, TrendingUp, Sparkles } from "lucide-react"
import { track as trackEvent } from "@/lib/analytics"

// Wrap track to handle errors gracefully
const track = (event: string, props?: Record<string, any>) => {
  try {
    trackEvent(event as any, props)
  } catch {
    // Silently fail if analytics tracking fails
  }
}

export default function Home() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [mounted, setMounted] = useState(false)

  // Supabase falls back to Site URL root when /auth/callback is not in Redirect URLs,
  // producing http://localhost:3000/?code=... — forward to the real callback route.
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      router.replace(`/api/auth/callback${window.location.search}`)
    }
  }, [router])

  useEffect(() => {
    setMounted(true)
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check', { 
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache' }
        })
        const data = await res.json().catch(() => ({}))
        setIsAuthenticated(data?.authenticated && data?.verified)
      } catch {
        setIsAuthenticated(false)
      }
    }
    checkAuth()
  }, [])

  return (
    <div className="relative">
      {/* Extended gradient background covering entire page - with purple hint at top */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-500/8 via-primary/10 via-blue-50/50 to-primary/8 -z-10" />
      <div className="fixed inset-0 bg-gradient-to-tr from-purple-400/12 via-transparent via-blue-100/30 to-primary/8 -z-10" />
      
      {/* Large animated background elements - covering more area with purple accents */}
      {mounted && (
        <>
          <div className="fixed top-0 left-0 w-[800px] h-[800px] bg-purple-500/12 rounded-full blur-[150px] -z-10 animate-pulse" />
          <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[130px] -z-10 animate-pulse [animation-delay:0.3s]" />
          <div className="fixed bottom-0 right-0 w-[900px] h-[900px] bg-blue-500/15 rounded-full blur-[150px] -z-10 animate-pulse [animation-delay:1s]" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/10 rounded-full blur-[130px] -z-10 animate-pulse [animation-delay:0.5s]" />
        </>
      )}
      
      <div className="flex flex-col relative z-10">
      
      {/* Hero Section - Clean & Attractive */}
      <section className="relative px-4 pt-12 pb-6 md:pt-20 md:pb-8 text-center max-w-6xl mx-auto">
        {/* Main Content */}
        <div className="relative z-10">
            <h1 className="mb-4 text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-tight">
              Get matched to{" "}
              <span className="bg-gradient-to-r from-primary via-blue-600 to-primary bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                1,002 investors
              </span>
              <br className="hidden md:block" />
              who actually fund startups like yours
            </h1>
          <p className="mx-auto mb-6 max-w-2xl text-lg md:text-xl text-slate-600 leading-relaxed" suppressHydrationWarning>
            Upload your pitch idea, deck, or video → AI analyzes and provides feedback → get matched with investors who are a real fit, not just a giant spreadsheet.
          </p>
          
          {/* CTA Buttons - Primary & Secondary */}
          <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Button 
              onClick={() => {
                track('cta_clicked', { name: 'find_matches', page: 'home' })
                if (!mounted || !isAuthenticated) {
                  router.push('/signup')
                } else {
                  router.push('/founder/dashboard')
                }
              }}
              size="lg" 
              className="group relative text-base px-10 py-6 bg-gradient-to-r from-primary via-blue-600 to-primary bg-[length:200%_auto] hover:bg-[length:200%_auto] hover:bg-[position:100%_0] shadow-lg hover:shadow-xl hover:shadow-primary/40 transition-all duration-500 hover:-translate-y-1 hover:scale-105 font-semibold overflow-hidden border-0"
            >
              <span className="relative z-10 flex items-center">
                {mounted && isAuthenticated ? 'Go to Dashboard' : 'Find My Matches'}
                {mounted && isAuthenticated ? (
                  <LayoutDashboard className="ml-2 h-5 w-5 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110" />
                ) : (
                  <Rocket className="ml-2 h-5 w-5 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:rotate-12 group-hover:scale-110" />
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-pulse" />
            </Button>
            <Button
              onClick={() => {
                router.push('/founder/discover')
              }}
              size="lg"
              variant="outline"
              className="text-base px-10 py-6 border-2 border-slate-300 hover:border-primary hover:bg-primary/5 transition-all duration-300 font-semibold"
            >
              Browse Investors
            </Button>
          </div>
          
          {/* Interactive Trust Badges - Compact */}
          {mounted && (
            <div className="flex flex-wrap items-center justify-center gap-4 max-w-2xl mx-auto mt-1">
              <div className="group relative flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 hover:border-green-400 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:scale-105 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-green-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-2 h-2 rounded-full bg-green-500 group-hover:scale-150 group-hover:shadow-lg group-hover:shadow-green-500/50 transition-all duration-300 animate-pulse" />
                <span className="relative text-sm font-medium text-slate-700 group-hover:text-green-700 transition-colors">Double opt-in</span>
              </div>
              <div className="group relative flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:scale-105 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-2 h-2 rounded-full bg-primary group-hover:scale-150 group-hover:shadow-lg group-hover:shadow-primary/50 transition-all duration-300 animate-pulse" />
                <span className="relative text-sm font-medium text-slate-700 group-hover:text-primary transition-colors">Private by default</span>
              </div>
              <div className="group relative flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:scale-105 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-2 h-2 rounded-full bg-blue-500 group-hover:scale-150 group-hover:shadow-lg group-hover:shadow-blue-500/50 transition-all duration-300 animate-pulse" />
                <span className="relative text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors">Global coverage</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Cursor Fund Coach CTA - NEW */}
      <section className="relative px-4 py-8 md:py-12">
        <div className="w-full max-w-6xl mx-auto px-0">
          <div className="relative rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 p-1 shadow-2xl overflow-hidden">
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] animate-[shimmer_3s_ease-in-out_infinite]" />
            
            <div className="relative bg-white rounded-[1.375rem] p-10 md:p-14">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 mb-8">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-indigo-700">NEW: AI-Powered Fund Coach</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Get Your Personalized <br className="hidden md:block" />
                <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Fundraising Roadmap
                </span>
              </h2>
              
              <p className="text-xl text-slate-600 mb-8 max-w-3xl leading-relaxed">
                Upload your pitch idea, pitch deck, or video pitch. Our AI analyzes your materials, gives investor-style feedback, 
                and matches you with the <span className="font-semibold text-slate-900"> best VCs, accelerators, and funding programs</span> from our database of 
                <span className="font-bold text-indigo-600"> 1,002 verified investors</span>. 
                Get genuine, tailored recommendations with personalized talking points for each investor.
              </p>
              
              <div className="grid sm:grid-cols-3 gap-6 mb-10">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 mb-1">Deep Analysis</p>
                    <p className="text-sm text-slate-600 leading-relaxed">Pitch, traction, team, and market assessment</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 mb-1">Smart Matching</p>
                    <p className="text-sm text-slate-600 leading-relaxed">Personalized investor recommendations</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 mb-1">Pitch Adaptation</p>
                    <p className="text-sm text-slate-600 leading-relaxed">Custom talking points for each investor</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-5">
                <Button 
                  onClick={() => {
                    track('cta_clicked', { name: 'start_free_analysis', page: 'home' })
                    if (!mounted || !isAuthenticated) {
                      router.push('/signup')
                    } else {
                      router.push('/onboarding/founder')
                    }
                  }}
                  size="lg"
                  className="group relative text-lg px-10 py-7 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 hover:from-indigo-700 hover:via-blue-700 hover:to-purple-700 shadow-lg hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 hover:-translate-y-1 hover:scale-105 font-bold border-0 rounded-xl"
                >
                  <span className="relative z-10 flex items-center">
                    Start Free Analysis
                    <Sparkles className="ml-2 h-6 w-6 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110" />
                  </span>
                </Button>
                
                <Link href="/analysis">
                  <Button 
                    size="lg"
                    variant="outline"
                    className="text-lg px-10 py-7 border-2 border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-300 hover:scale-105 font-semibold rounded-xl"
                  >
                    View Sample Analysis
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hype Panel - Exciting Value Props */}
      <section className="relative px-4 pt-2 pb-4 md:pt-4 md:pb-6">
        <div className="w-full max-w-6xl mx-auto px-0">
          <div className={`relative rounded-2xl bg-gradient-to-br from-white via-white to-blue-50/30 border border-slate-200/80 shadow-xl overflow-hidden backdrop-blur-sm transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5 animate-pulse" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl -translate-y-1/2 animate-pulse [animation-delay:0.5s]" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl translate-y-1/2 animate-pulse [animation-delay:1s]" />
            
            <div className="relative z-10 p-8 md:p-12">
              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                  Stop <span className="bg-gradient-to-r from-purple-600 via-primary to-blue-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">Blind Outreach, Start Smart Matching</span>
                </h2>
                <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
                  Get matched with VCs who actually want to invest in companies like yours
                </p>
              </div>

              {/* Feature Grid - Animated */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {/* Feature 1 */}
                <div className="group relative flex flex-col items-center text-center p-6 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200/50 hover:border-purple-300/50 hover:shadow-lg transition-all duration-500 hover:-translate-y-2 hover:scale-105">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-xl group-hover:bg-purple-400/30 transition-all duration-500" />
                    <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Target className="w-7 h-7 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-purple-700 transition-colors">
                    Smart Matching
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    AI analyzes your stage, sector, vision, and working style to match you with investors who truly get your ideas
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="group relative flex flex-col items-center text-center p-6 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200/50 hover:border-primary/50 hover:shadow-lg transition-all duration-500 hover:-translate-y-2 hover:scale-105">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-all duration-500" />
                    <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Zap className="w-7 h-7 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-primary transition-colors">
                    Faster Results
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Skip cold emails. Get introduced to VCs actively looking for founders like you
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="group relative flex flex-col items-center text-center p-6 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200/50 hover:border-blue-400/50 hover:shadow-lg transition-all duration-500 hover:-translate-y-2 hover:scale-105">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-xl group-hover:bg-blue-400/30 transition-all duration-500" />
                    <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-7 h-7 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">
                    Quality Network
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Connect with 1,002+ verified VCs, accelerators, and corporate programs worldwide
                  </p>
                </div>
              </div>

              {/* Bottom CTA Line */}
              <div className="mt-8 pt-8 border-t border-slate-200/50 flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="font-medium">AI-powered matching</span>
                  <span className="text-slate-400">•</span>
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">Evidence-based</span>
                  <span className="text-slate-400">•</span>
                  <span className="font-medium text-slate-900">1,002 verified investors</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats Section - Interactive & Attractive */}
      <section className="relative pt-4 pb-8 md:pt-6 md:pb-10 px-4">
        <div className="w-full max-w-6xl mx-auto px-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="group relative text-center p-5 rounded-xl bg-white/95 backdrop-blur-sm border border-slate-200 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 hover:-translate-y-1.5 hover:scale-105 cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative text-3xl md:text-4xl font-bold text-slate-900 mb-2 group-hover:text-primary transition-all duration-300 group-hover:scale-110">
                500+
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
              </div>
              <p className="relative text-xs md:text-sm text-slate-600 font-medium group-hover:text-slate-700">Active VCs</p>
            </div>
            <div className="group relative text-center p-5 rounded-xl bg-white/95 backdrop-blur-sm border border-slate-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-400/20 transition-all duration-300 hover:-translate-y-1.5 hover:scale-105 cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative text-3xl md:text-4xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-all duration-300 group-hover:scale-110">
                1,002
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
              </div>
              <p className="relative text-xs md:text-sm text-slate-600 font-medium group-hover:text-slate-700">Verified Investors</p>
            </div>
            <div className="group relative text-center p-5 rounded-xl bg-white/95 backdrop-blur-sm border border-slate-200 hover:border-green-400 hover:shadow-xl hover:shadow-green-400/20 transition-all duration-300 hover:-translate-y-1.5 hover:scale-105 cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative text-3xl md:text-4xl font-bold text-slate-900 mb-2 group-hover:text-green-600 transition-all duration-300 group-hover:scale-110">
                50+
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
              </div>
              <p className="relative text-xs md:text-sm text-slate-600 font-medium group-hover:text-slate-700">Sectors Covered</p>
            </div>
            <div className="group relative text-center p-5 rounded-xl bg-white/95 backdrop-blur-sm border border-slate-200 hover:border-orange-400 hover:shadow-xl hover:shadow-orange-400/20 transition-all duration-300 hover:-translate-y-1.5 hover:scale-105 cursor-pointer overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative text-3xl md:text-4xl font-bold text-slate-900 mb-2 group-hover:text-orange-600 transition-all duration-300 group-hover:scale-110">
                AI
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
              </div>
              <p className="relative text-xs md:text-sm text-slate-600 font-medium group-hover:text-slate-700">Smart Matching</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Privacy Footer */}
      <section className="relative px-4 pb-12 md:pb-16">
        <div className="w-full max-w-6xl mx-auto px-0">
          <div className="rounded-2xl bg-slate-50/80 backdrop-blur-sm border border-slate-200/50 p-8 md:p-10">
            <div className="text-center mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                Your data is safe with us
              </h3>
              <p className="text-slate-600 max-w-2xl mx-auto">
                We take your privacy seriously. Your pitch deck and personal information are secure and never shared without your permission.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mb-3">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">Secure Storage</h4>
                <p className="text-slate-600">Your deck and data are encrypted and stored securely</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mb-3">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">Private by Default</h4>
                <p className="text-slate-600">Investors only see your profile if you choose to connect</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 mb-3">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">Full Control</h4>
                <p className="text-slate-600">Delete your account and data anytime with one click</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  )
}


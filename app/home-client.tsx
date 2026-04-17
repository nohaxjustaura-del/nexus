'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthSession } from '@/components/auth-session-provider'
import type { UniversalAnalysisResult } from '@/lib/universal-analysis-engine'
import { HeroSection } from '@/components/ui/hero-section-1'
import type { HomeBelowFoldProps } from '@/app/home-below-fold'

const HomeBelowFold = dynamic<HomeBelowFoldProps>(
  () => import('@/app/home-below-fold').then((m) => ({ default: m.HomeBelowFold })),
  { ssr: false, loading: () => null }
)
const ProductPreview = dynamic(
  () => import('@/components/marketing/product-preview').then((m) => ({ default: m.ProductPreview })),
  { ssr: false, loading: () => null }
)

export type HomeClientProps = {
  verifiedInvestorCountLabel: string
  analysesCountLabel: string
  homeDemoRubric: UniversalAnalysisResult
}

export default function HomeClient({ verifiedInvestorCountLabel, analysesCountLabel, homeDemoRubric }: HomeClientProps) {
  const router = useRouter()
  const { loading: authLoading, authenticated, verified } = useAuthSession()
  const [mounted, setMounted] = useState(false)
  const isVerifiedUser = !authLoading && authenticated && verified

  useEffect(() => {
    if (typeof window === 'undefined') return
    const q = new URLSearchParams(window.location.search)
    if (q.get('code') || q.get('token_hash')) {
      router.replace(`/api/auth/callback${window.location.search}`)
    }
  }, [router])

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative min-h-screen bg-background">
      <div className="relative z-10 flex flex-col">
        <HeroSection
          showHeader={false}
          verifiedInvestorCountLabel={verifiedInvestorCountLabel}
          analysesCountLabel={analysesCountLabel}
        />

        <ProductPreview />

        <HomeBelowFold homeDemoRubric={homeDemoRubric} mounted={mounted} isVerifiedUser={isVerifiedUser} />
      </div>
    </div>
  )
}

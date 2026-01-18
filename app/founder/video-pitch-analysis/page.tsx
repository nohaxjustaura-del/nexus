'use client'

import { useEffect } from 'react'

export default function VideoPitchAnalysisPage() {
  useEffect(() => {
    // Immediately redirect to AI Analysis page (hard redirect)
    if (typeof window !== 'undefined') {
      window.location.replace('/founder/ai-analysis')
    }
  }, [])

  return null
}


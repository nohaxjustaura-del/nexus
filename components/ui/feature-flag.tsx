'use client'

import { ReactNode } from 'react'

interface FeatureFlagProps {
  flag: string
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Feature flag component for conditional rendering
 * Usage: <FeatureFlag flag="new_feature">{content}</FeatureFlag>
 */
export function FeatureFlag({ flag, children, fallback = null }: FeatureFlagProps) {
  // In a real app, this would check against a feature flag service
  // For now, we'll check environment variables
  const isEnabled = process.env[`NEXT_PUBLIC_FEATURE_${flag.toUpperCase()}`] === 'true'

  return isEnabled ? <>{children}</> : <>{fallback}</>
}

// Hook version for use in components
export function useFeatureFlag(flag: string): boolean {
  return process.env[`NEXT_PUBLIC_FEATURE_${flag.toUpperCase()}`] === 'true'
}





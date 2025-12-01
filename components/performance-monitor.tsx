'use client'

import { useEffect } from 'react'

/**
 * Performance monitoring component
 * Tracks Core Web Vitals and reports to analytics
 */
export function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') {
      return
    }

    // Track Core Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime)
          // Send to analytics service
        })
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            console.log('FID:', entry.processingStart - entry.startTime)
            // Send to analytics service
          })
        })
        fidObserver.observe({ type: 'first-input', buffered: true })

        // Cumulative Layout Shift (CLS)
        let clsScore = 0
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsScore += entry.value
            }
          }
          console.log('CLS:', clsScore)
          // Send to analytics service
        })
        clsObserver.observe({ type: 'layout-shift', buffered: true })

        return () => {
          lcpObserver.disconnect()
          fidObserver.disconnect()
          clsObserver.disconnect()
        }
      } catch (error) {
        console.error('Performance monitoring error:', error)
      }
    }

    // Track page load time
    window.addEventListener('load', () => {
      const perfData = window.performance.timing
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart
      console.log('Page load time:', pageLoadTime, 'ms')
      // Send to analytics service
    })
  }, [])

  return null
}





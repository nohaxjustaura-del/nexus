'use client'

import { useEffect } from 'react'

type VitalName = 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB'

type VitalPayload = {
  name: VitalName
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  pathname: string
  userAgent: string
}

function rateMetric(name: VitalName, value: number): VitalPayload['rating'] {
  if (name === 'LCP') {
    if (value <= 2500) return 'good'
    if (value <= 4000) return 'needs-improvement'
    return 'poor'
  }
  if (name === 'INP') {
    if (value <= 200) return 'good'
    if (value <= 500) return 'needs-improvement'
    return 'poor'
  }
  if (name === 'FCP') {
    if (value <= 1800) return 'good'
    if (value <= 3000) return 'needs-improvement'
    return 'poor'
  }
  if (name === 'TTFB') {
    if (value <= 800) return 'good'
    if (value <= 1800) return 'needs-improvement'
    return 'poor'
  }
  if (value <= 0.1) return 'good'
  if (value <= 0.25) return 'needs-improvement'
  return 'poor'
}

function sendMetric(payload: VitalPayload) {
  const body = JSON.stringify(payload)
  const url = '/api/telemetry/web-vitals'
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon(url, blob)
    return
  }
  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  })
}

export function WebVitalsReporter() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return

    let clsValue = 0
    let sentLcp = false
    let sentInp = false

    const send = (name: VitalName, value: number) => {
      sendMetric({
        name,
        value: Number(value.toFixed(name === 'CLS' ? 4 : 0)),
        rating: rateMetric(name, value),
        pathname: window.location.pathname,
        userAgent: navigator.userAgent,
      })
    }

    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const lcp = entries[entries.length - 1]
      if (!lcp || sentLcp) return
      sentLcp = true
      send('LCP', lcp.startTime)
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })

    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
        if (!entry.hadRecentInput && typeof entry.value === 'number') {
          clsValue += entry.value
        }
      }
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })

    const inpObserver = new PerformanceObserver((entryList) => {
      if (sentInp) return
      const entry = entryList.getEntries().at(-1) as
        | (PerformanceEntry & { duration?: number; processingStart?: number; startTime: number })
        | undefined
      if (!entry) return
      sentInp = true
      const value =
        typeof entry.duration === 'number'
          ? entry.duration
          : typeof entry.processingStart === 'number'
            ? entry.processingStart - entry.startTime
            : 0
      send('INP', value)
    })
    inpObserver.observe({ type: 'event', buffered: true } as PerformanceObserverInit)

    const paintObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          send('FCP', entry.startTime)
        }
      }
    })
    paintObserver.observe({ type: 'paint', buffered: true })

    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    if (navEntries.length > 0) {
      send('TTFB', navEntries[0].responseStart)
    }

    const flushCls = () => {
      send('CLS', clsValue)
    }
    window.addEventListener('pagehide', flushCls)

    return () => {
      window.removeEventListener('pagehide', flushCls)
      lcpObserver.disconnect()
      clsObserver.disconnect()
      inpObserver.disconnect()
      paintObserver.disconnect()
    }
  }, [])

  return null
}

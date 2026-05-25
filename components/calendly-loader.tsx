'use client'

import Script from 'next/script'
import { useEffect } from 'react'

/**
 * Injects the Calendly popup widget script and stylesheet.
 * Rendered once on partner hub pages. Uses lazyOnload so it never
 * blocks page rendering. If window.Calendly is undefined when the
 * Book button is clicked, InvestorBookingModal falls back to opening
 * the Calendly URL in a new tab.
 */
export function CalendlyLoader() {
  useEffect(() => {
    if (document.querySelector('link[data-calendly-css]')) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://assets.calendly.com/assets/external/widget.css'
    link.setAttribute('data-calendly-css', '1')
    document.head.appendChild(link)
  }, [])

  return (
    <Script
      src="https://assets.calendly.com/assets/external/widget.js"
      strategy="lazyOnload"
    />
  )
}

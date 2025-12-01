export type AnalyticsEvent =
  | 'cta_clicked'
  | 'filter_changed'
  | 'result_impression'
  | 'result_clicked'
  | 'bookmark_toggled'
  | 'apply_redirected'
  | 'upload_started'
  | 'upload_completed'
  | 'purchase_attempted'
  | 'purchase_succeeded'
  | 'tab_changed'

export function track(event: AnalyticsEvent, props: Record<string, any> = {}) {
  try {
    if (typeof window !== 'undefined') {
      ;(window as any).dataLayer = (window as any).dataLayer || []
      ;(window as any).dataLayer.push({ event, ...props, ts: Date.now() })
    }
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[analytics]', event, props)
    }
  } catch {
    // no-op
  }
}



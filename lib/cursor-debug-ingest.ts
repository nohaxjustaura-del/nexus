/**
 * Optional Cursor/agent debug ingest. Off unless CURSOR_DEBUG_INGEST=1 so auth and email
 * paths never pay fetch latency or connection attempts in normal dev/prod.
 */
const INGEST_URL =
  'http://127.0.0.1:7464/ingest/8942f439-d0f1-43ea-9e6d-5d7995eef824'

export function sendCursorDebugIngest(payload: {
  runId?: string
  hypothesisId: string
  location: string
  message: string
  data: Record<string, unknown>
  sessionId?: string
}): void {
  if (process.env.CURSOR_DEBUG_INGEST !== '1') return

  fetch(INGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': payload.sessionId ?? '0f3c2c',
    },
    body: JSON.stringify({
      sessionId: payload.sessionId ?? '0f3c2c',
      runId: payload.runId ?? 'default',
      hypothesisId: payload.hypothesisId,
      location: payload.location,
      message: payload.message,
      data: payload.data,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
}

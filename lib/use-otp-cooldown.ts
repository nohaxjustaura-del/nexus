'use client'

import { useEffect, useState } from 'react'

/** Counts down once per second after `start(seconds)`; used after OTP send / rate-limit responses. */
export function useOtpCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = window.setTimeout(() => setSecondsLeft((c) => Math.max(0, c - 1)), 1000)
    return () => window.clearTimeout(id)
  }, [secondsLeft])

  const start = (sec: number) => {
    const n = Math.max(0, Math.floor(Number(sec) || 0))
    setSecondsLeft(n)
  }

  return { secondsLeft, start, active: secondsLeft > 0 }
}

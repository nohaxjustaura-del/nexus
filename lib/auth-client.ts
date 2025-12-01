'use client'

// Client-side auth utilities
export async function checkAuth(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/check', {
      method: 'GET',
      credentials: 'include',
    })
    return response.ok
  } catch {
    return false
  }
}

export function redirectToSignup(returnUrl?: string) {
  const signupUrl = returnUrl 
    ? `/signup?redirect=${encodeURIComponent(returnUrl)}`
    : '/signup'
  window.location.href = signupUrl
}















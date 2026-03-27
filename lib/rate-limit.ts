/**
 * Rate limiting utility
 * Prevents abuse of API endpoints by limiting requests per user/IP
 * 
 * For production, consider using:
 * - @upstash/ratelimit (Redis-based, distributed)
 * - Vercel Edge Config
 * - Custom Redis solution
 */

import { getCurrentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { bypassesAiCredits } from '@/lib/dev-ai-analysis-bypass'
import { logger } from '@/lib/logger'

// In-memory store for rate limiting (for development/single-instance)
// In production, use Redis or a distributed cache
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Clean up old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

interface RateLimitOptions {
  /** Maximum number of requests allowed */
  limit: number
  /** Time window in milliseconds */
  windowMs: number
  /** Identifier for the rate limit (e.g., 'analyze-pitch-idea') */
  identifier: string
  /** Skip rate limit for admin / UNLIMITED_CREDITS_EMAIL / dev AI bypass */
  skipAdmin?: boolean
}

/**
 * Get rate limit key for a user/IP
 */
function getRateLimitKey(
  identifier: string,
  userId?: string,
  ip?: string
): string {
  // Prefer user ID if available (more accurate)
  if (userId) {
    return `${identifier}:user:${userId}`
  }
  // Fallback to IP address
  if (ip) {
    return `${identifier}:ip:${ip}`
  }
  // Last resort: use a default key
  return `${identifier}:default`
}

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
  // Try various headers (for proxies, load balancers, etc.)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  // Fallback
  return request.ip || 'unknown'
}

/**
 * Check if request should be rate limited
 * Returns null if allowed, or rate limit info if exceeded
 */
export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<{ allowed: boolean; remaining: number; resetAt: number } | null> {
  // Bypass all rate limiting when DISABLE_RATE_LIMIT=true (e.g. during local debugging)
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return { allowed: true, remaining: options.limit, resetAt: Date.now() + options.windowMs }
  }

  const { limit, windowMs, identifier, skipAdmin = true } = options

  try {
    // Skip rate limit for same cohort as unlimited credits (admin list, UNLIMITED_CREDITS_EMAIL, dev bypass)
    if (skipAdmin) {
      try {
        const user = await getCurrentUser()
        if (bypassesAiCredits(user?.email)) {
          return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs }
        }
      } catch (error) {
        // If auth fails, continue with rate limiting
        logger.warn(`[RATE-LIMIT] Auth check failed for ${identifier}, continuing with rate limit`)
      }
    }

    // Get identifier (user ID or IP)
    let userId: string | undefined
    try {
      const user = await getCurrentUser()
      userId = user?.id
    } catch {
      // User not authenticated, use IP
    }

    const ip = getClientIP(request)
    const key = getRateLimitKey(identifier, userId, ip)

    const now = Date.now()
    const record = rateLimitStore.get(key)

    if (!record || record.resetAt < now) {
      // First request or window expired - create new record
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + windowMs,
      })
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs }
    }

    if (record.count >= limit) {
      // Rate limit exceeded
      return { allowed: false, remaining: 0, resetAt: record.resetAt }
    }

    // Increment count
    record.count++
    rateLimitStore.set(key, record)
    return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt }
  } catch (error) {
    // If rate limiting fails, allow the request (fail open)
    logger.error(`[RATE-LIMIT] Error checking rate limit for ${identifier}:`, error)
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs }
  }
}

/**
 * Rate limit middleware for API routes
 * Returns NextResponse with 429 status if rate limited, or null if allowed
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const result = await checkRateLimit(request, options)

  if (!result) {
    // Rate limit check failed, allow request
    return null
  }

  if (!result.allowed) {
    // Rate limit exceeded
    const resetIn = Math.ceil((result.resetAt - Date.now()) / 1000)
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${resetIn} seconds.`,
        retryAfter: resetIn,
      },
      {
        status: 429,
        headers: {
          'Retry-After': resetIn.toString(),
          'X-RateLimit-Limit': options.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
        },
      }
    )
  }

  // Request allowed - add rate limit headers
  return null
}

/**
 * Pre-configured rate limiters for common endpoints
 */
export const RATE_LIMITS = {
  AI_ANALYSIS: {
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
    identifier: 'ai-analysis',
  },
  GENERAL_API: {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
    identifier: 'api',
  },
} as const


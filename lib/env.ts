/**
 * Environment variable validation
 * Validates all required environment variables at startup
 * Throws errors if required variables are missing
 */

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function getOptionalEnvVar(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue
}

// Database
export const DATABASE_URL = getEnvVar('DATABASE_URL')

// Authentication
export const NEXTAUTH_SECRET = getEnvVar('NEXTAUTH_SECRET')
export const NEXTAUTH_URL = getOptionalEnvVar('NEXTAUTH_URL', 'http://localhost:3000')

// AI Services
export const OPENAI_API_KEY = getOptionalEnvVar('OPENAI_API_KEY')
export const OPENROUTER_API_KEY = getOptionalEnvVar('OPENROUTER_API_KEY')
export const TAVILY_API_KEY = getOptionalEnvVar('TAVILY_API_KEY')

// Stripe (optional - only needed for payments)
export const STRIPE_SECRET_KEY = getOptionalEnvVar('STRIPE_SECRET_KEY')
export const STRIPE_WEBHOOK_SECRET = getOptionalEnvVar('STRIPE_WEBHOOK_SECRET')
export const STRIPE_PRICE_STARTER = getOptionalEnvVar('STRIPE_PRICE_STARTER')
export const STRIPE_PRICE_FOUNDER = getOptionalEnvVar('STRIPE_PRICE_FOUNDER')
export const STRIPE_PRICE_PRO = getOptionalEnvVar('STRIPE_PRICE_PRO')
export const STRIPE_PRICE_PREMIUM = getOptionalEnvVar('STRIPE_PRICE_PREMIUM')

// Application
export const NODE_ENV = getOptionalEnvVar('NODE_ENV', 'development')
export const NEXT_PUBLIC_URL = getOptionalEnvVar('NEXT_PUBLIC_URL', 'http://localhost:3000')

// Email (optional)
export const SMTP_HOST = getOptionalEnvVar('SMTP_HOST')
export const SMTP_PORT = getOptionalEnvVar('SMTP_PORT')
export const SMTP_USER = getOptionalEnvVar('SMTP_USER')
export const SMTP_PASSWORD = getOptionalEnvVar('SMTP_PASSWORD')
export const SMTP_FROM = getOptionalEnvVar('SMTP_FROM')

// Validation helper
export function validateEnv(): void {
  try {
    // This will throw if required vars are missing
    const required = [
      DATABASE_URL,
      NEXTAUTH_SECRET,
    ]
    
    // Log validation success (only in development)
    if (NODE_ENV === 'development') {
      console.log('✅ Environment variables validated successfully')
    }
  } catch (error) {
    console.error('❌ Environment variable validation failed:', error)
    throw error
  }
}

// Call validation on import (only in server-side code)
if (typeof window === 'undefined') {
  try {
    validateEnv()
  } catch (error) {
    // Don't throw in client-side code or during build
    if (process.env.NODE_ENV === 'production') {
      console.error('Environment validation failed:', error)
    }
  }
}



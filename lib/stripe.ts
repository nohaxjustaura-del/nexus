import Stripe from 'stripe'

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
  typescript: true,
})

// Product price IDs (you'll need to create these in Stripe Dashboard and update here)
export const STRIPE_PRICES = {
  STARTER_PACK: process.env.STRIPE_PRICE_STARTER || 'price_starter_50_credits', // $19 / 50 credits
  FOUNDER_PACK: process.env.STRIPE_PRICE_FOUNDER || 'price_founder_150_credits', // $49 / 150 credits
  PRO_PACK: process.env.STRIPE_PRICE_PRO || 'price_pro_400_credits', // $99 / 400 credits
  PREMIUM: process.env.STRIPE_PRICE_PREMIUM || 'price_premium_monthly', // $79/month
}

// Credit packages configuration
export const CREDIT_PACKAGES = {
  starter: {
    credits: 50,
    price: 19,
    priceId: STRIPE_PRICES.STARTER_PACK,
    name: 'Starter',
    description: '50 credits - $0.38 per credit',
  },
  founder: {
    credits: 150,
    price: 49,
    priceId: STRIPE_PRICES.FOUNDER_PACK,
    name: 'Founder',
    description: '150 credits - $0.33 per credit, 13% savings',
  },
  pro: {
    credits: 400,
    price: 99,
    priceId: STRIPE_PRICES.PRO_PACK,
    name: 'Pro',
    description: '400 credits - $0.25 per credit, 34% savings',
  },
}

// Premium subscription configuration
export const PREMIUM_SUBSCRIPTION = {
  price: 79,
  priceId: STRIPE_PRICES.PREMIUM,
  name: 'Premium',
  description: 'Unlimited usage - Best value if you use 300+ credits/month',
}

// Helper: Get package by credits
export function getPackageByCredits(credits: number) {
  if (credits === 50) return CREDIT_PACKAGES.starter
  if (credits === 150) return CREDIT_PACKAGES.founder
  if (credits === 400) return CREDIT_PACKAGES.pro
  return null
}

// Helper: Format price for display
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}


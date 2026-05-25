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
  PREMIUM: process.env.STRIPE_PRICE_PREMIUM || 'price_premium_monthly', // optional: use Stripe Price IDs instead of price_data
}

// Credit packages configuration
export const CREDIT_PACKAGES = {
  starter: {
    credits: 50,
    price: 19,
    priceId: STRIPE_PRICES.STARTER_PACK,
    name: 'Starter',
    description: 'Starter top-up — $19 · adds 50 to your balance',
  },
  founder: {
    credits: 150,
    price: 49,
    priceId: STRIPE_PRICES.FOUNDER_PACK,
    name: 'Founder',
    description: 'Founder top-up — $49 · adds 150 to your balance (~13% savings vs starter)',
  },
  pro: {
    credits: 400,
    price: 99,
    priceId: STRIPE_PRICES.PRO_PACK,
    name: 'Pro',
    description: 'Pro top-up — $99 · adds 400 to your balance (~34% savings vs starter)',
  },
}

// Pro monthly subscription (Checkout uses price_data; amount must match /pricing)
export const PREMIUM_SUBSCRIPTION = {
  price: 39,
  priceId: STRIPE_PRICES.PREMIUM,
  name: 'NEXUS Pro',
  description: 'Unlimited analyses, full investor database, and Pro features. Billed monthly.',
}

export const TEAM_SUBSCRIPTION = {
  price: 99,
  name: 'NEXUS Team',
  description: 'Everything in Pro plus team seats and shared workspace. Billed monthly.',
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


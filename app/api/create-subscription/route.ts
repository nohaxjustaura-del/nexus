import { NextRequest, NextResponse } from 'next/server'
import { stripe, PREMIUM_SUBSCRIPTION, TEAM_SUBSCRIPTION } from '@/lib/stripe'
import { getCurrentUser } from '@/lib/auth'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


export async function POST(request: NextRequest) {
  try {
    let plan: 'pro' | 'team' = 'pro'
    try {
      const body = await request.json()
      if (body?.plan === 'team') plan = 'team'
    } catch {
      // no JSON body: default Pro
    }

    const line = plan === 'team' ? TEAM_SUBSCRIPTION : PREMIUM_SUBSCRIPTION

    // Get current user
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has a Stripe customer ID
    // You might want to store this in your database
    let customerId: string | undefined

    // Try to find existing customer by email
    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id
    }

    // Create Stripe checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: line.name,
              description: line.description,
            },
            unit_amount: line.price * 100,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id || user.email,
        userEmail: user.email,
        premium: 'true',
        plan,
      },
      customer: customerId,
      customer_email: !customerId ? user.email : undefined,
      success_url: `${getSiteUrl(request)}/pricing?success=true&premium=true`,
      cancel_url: `${getSiteUrl(request)}/pricing?canceled=true`,
      subscription_data: {
        metadata: {
          userId: user.id || user.email,
          userEmail: user.email,
        },
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error('Subscription session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription session' },
      { status: 500 }
    )
  }
}






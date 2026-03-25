import { NextRequest, NextResponse } from 'next/server'
import { stripe, CREDIT_PACKAGES } from '@/lib/stripe'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { package: packageType } = await request.json()

    // Validate package
    if (!packageType || !['starter', 'founder', 'pro'].includes(packageType)) {
      return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
    }

    const creditPackage = CREDIT_PACKAGES[packageType as keyof typeof CREDIT_PACKAGES]

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: creditPackage.name,
              description: creditPackage.description,
            },
            unit_amount: creditPackage.price * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id || user.email,
        userEmail: user.email,
        credits: creditPackage.credits.toString(),
        packageType,
      },
      customer_email: user.email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?success=true&credits=${creditPackage.credits}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?canceled=true`,
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error('Checkout session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

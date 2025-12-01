import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import Stripe from 'stripe'

// Disable body parsing for webhook
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  console.log('✅ Webhook received:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        console.log('Processing checkout session:', session.id)

        // Handle credit purchase
        if (session.mode === 'payment' && session.metadata?.credits) {
          const userEmail = session.metadata.userEmail || session.customer_email
          const credits = parseInt(session.metadata.credits)

          if (userEmail && credits) {
            // Find user by email
            const user = await db.user.findUnique({
              where: { email: userEmail },
            })

            if (user) {
              // Update or create user credits
              const existingCredits = await db.userCredits.findUnique({
                where: { userId: user.id },
              })

              if (existingCredits) {
                await db.userCredits.update({
                  where: { userId: user.id },
                  data: {
                    credits: { increment: credits },
                  },
                })
              } else {
                await db.userCredits.create({
                  data: {
                    userId: user.id,
                    credits: credits,
                    isPremium: false,
                  },
                })
              }

              console.log(`✅ Added ${credits} credits to ${userEmail}`)
            }
          }
        }

        // Handle premium subscription
        if (session.mode === 'subscription' && session.metadata?.premium === 'true') {
          const userEmail = session.metadata.userEmail || session.customer_email

          if (userEmail) {
            // Find user
            const user = await db.user.findUnique({
              where: { email: userEmail },
            })

            if (user) {
              // Update or create user credits with premium status
              const existingCredits = await db.userCredits.findUnique({
                where: { userId: user.id },
              })

              if (existingCredits) {
                await db.userCredits.update({
                  where: { userId: user.id },
                  data: {
                    isPremium: true,
                    stripeCustomerId: session.customer as string,
                    stripeSubscriptionId: session.subscription as string,
                  } as any,
                })
              } else {
                await db.userCredits.create({
                  data: {
                    userId: user.id,
                    credits: 0,
                    isPremium: true,
                    stripeCustomerId: session.customer as string,
                    stripeSubscriptionId: session.subscription as string,
                  } as any,
                })
              }

              console.log(`✅ Activated Premium for ${userEmail}`)
            }
          }
        }

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Find user by subscription ID and remove premium
        const userCredits = await db.userCredits.findFirst({
          where: { 
            stripeSubscriptionId: subscription.id 
          } as any,
        })

        if (userCredits) {
          // Get user email separately
          const user = await db.user.findUnique({
            where: { id: userCredits.userId },
          })

          await db.userCredits.update({
            where: { userId: userCredits.userId },
            data: {
              isPremium: false,
              stripeSubscriptionId: null,
            } as any,
          })

          console.log(`✅ Deactivated Premium for ${user?.email || 'unknown'}`)
        }

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        // Handle subscription status changes
        const userCredits = await db.userCredits.findFirst({
          where: { 
            stripeSubscriptionId: subscription.id 
          } as any,
        })

        if (userCredits) {
          // Get user email separately
          const user = await db.user.findUnique({
            where: { id: userCredits.userId },
          })

          const isActive = ['active', 'trialing'].includes(subscription.status)

          await db.userCredits.update({
            where: { userId: userCredits.userId },
            data: {
              isPremium: isActive,
            },
          })

          console.log(`✅ Updated Premium status for ${user?.email || 'unknown'}: ${isActive}`)
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}


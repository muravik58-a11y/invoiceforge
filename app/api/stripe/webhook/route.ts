import { headers } from 'next/headers'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = (await headers()).get('stripe-signature')

  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret || webhookSecret.startsWith('whsec_xxx')) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET not configured')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[webhook] Invalid signature:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.orgId
        const rawPlan = session.metadata?.planId?.toUpperCase()

        if (orgId && rawPlan && rawPlan !== 'FREE') {
          await prisma.organization.update({
            where: { id: orgId },
            data: {
              planId: rawPlan as 'PRO' | 'ENTERPRISE',
              stripeCustomerId: (session.customer as string) || undefined,
              subscriptionId: (session.subscription as string) || undefined,
              subscriptionStatus: 'active',
            },
          })
          console.log(`[webhook] Upgraded org ${orgId} to ${rawPlan}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await prisma.organization.updateMany({
          where: { subscriptionId: sub.id },
          data: { subscriptionStatus: sub.status },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await prisma.organization.updateMany({
          where: { subscriptionId: sub.id },
          data: {
            planId: 'FREE',
            subscriptionStatus: 'canceled',
            subscriptionId: null,
          },
        })
        console.log(`[webhook] Downgraded org (sub ${sub.id}) to FREE`)
        break
      }
    }
  } catch (err) {
    console.error(`[webhook] Error processing ${event.type}:`, err)
    return new Response('Webhook processing error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}

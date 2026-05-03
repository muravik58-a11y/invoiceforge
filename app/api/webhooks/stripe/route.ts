import Stripe from 'stripe'
import prisma from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/resend'

export async function POST(req: Request) {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

  if (!STRIPE_SECRET_KEY) {
    console.error('[stripe-webhook] STRIPE_SECRET_KEY is not set')
    return new Response('Stripe not configured', { status: 500 })
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  // Instantiate lazily inside the handler so the module can load at build time
  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2026-03-25.dahlia' as '2026-03-25.dahlia',
  })

  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err)
    return new Response('Invalid webhook signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        const orgId = session.metadata?.orgId
        const planId = session.metadata?.planId

        if (!orgId || !planId) {
          console.warn('[stripe-webhook] checkout.session.completed: missing metadata')
          break
        }

        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null

        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id ?? null

        await prisma.organization.update({
          where: { id: orgId },
          data: {
            subscriptionId,
            subscriptionStatus: 'active',
            planId: planId as 'FREE' | 'PRO' | 'ENTERPRISE',
            ...(customerId ? { stripeCustomerId: customerId } : {}),
          },
        })

        // Create welcome notification and send welcome email
        const org = await prisma.organization.findUnique({
          where: { id: orgId },
          select: { name: true, id: true },
        })

        if (org) {
          await prisma.notification.create({
            data: {
              organizationId: orgId,
              title: 'Subscription activated',
              message: `Your ${planId} plan is now active. Enjoy all features!`,
              type: 'SUCCESS',
              link: '/settings',
            },
          })

          // Find the org owner's email from audit logs
          const ownerLog = await prisma.auditLog.findFirst({
            where: { organizationId: orgId },
            select: { userEmail: true },
            orderBy: { createdAt: 'asc' },
          })

          if (ownerLog?.userEmail) {
            await sendWelcomeEmail(ownerLog.userEmail, org.name).catch((e) =>
              console.error('[stripe-webhook] Failed to send welcome email:', e),
            )
          }
        }

        console.info(`[stripe-webhook] checkout.session.completed: org ${orgId} upgraded to ${planId}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        const orgId = subscription.metadata?.orgId
        if (!orgId) break

        const priceId = subscription.items.data[0]?.price?.id
        const status = subscription.status

        // Map Stripe status to our status field
        const subscriptionStatus =
          status === 'active'
            ? 'active'
            : status === 'past_due'
              ? 'past_due'
              : status === 'canceled'
                ? 'cancelled'
                : status === 'trialing'
                  ? 'trialing'
                  : status

        // Try to resolve planId from price
        const PRO_PRICE = process.env.STRIPE_PRO_PRICE_ID
        const ENT_PRICE = process.env.STRIPE_ENTERPRISE_PRICE_ID
        let resolvedPlanId: 'FREE' | 'PRO' | 'ENTERPRISE' = 'FREE'
        if (priceId && priceId === PRO_PRICE) resolvedPlanId = 'PRO'
        else if (priceId && priceId === ENT_PRICE) resolvedPlanId = 'ENTERPRISE'

        await prisma.organization.update({
          where: { id: orgId },
          data: {
            subscriptionStatus,
            planId: resolvedPlanId,
          },
        })

        console.info(`[stripe-webhook] customer.subscription.updated: org ${orgId} → ${subscriptionStatus}/${resolvedPlanId}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const orgId = subscription.metadata?.orgId
        if (!orgId) break

        await prisma.organization.update({
          where: { id: orgId },
          data: {
            subscriptionStatus: 'cancelled',
            planId: 'FREE',
          },
        })

        await prisma.notification.create({
          data: {
            organizationId: orgId,
            title: 'Subscription cancelled',
            message: 'Your subscription has been cancelled. You are now on the Free plan.',
            type: 'WARNING',
            link: '/settings',
          },
        })

        console.info(`[stripe-webhook] customer.subscription.deleted: org ${orgId}`)
        break
      }

      case 'invoice.payment_succeeded': {
        const stripeInvoice = event.data.object as Stripe.Invoice & {
          subscription?: string | { id: string } | null
          amount_paid?: number
        }
        const subscriptionId =
          typeof stripeInvoice.subscription === 'string'
            ? stripeInvoice.subscription
            : (stripeInvoice.subscription as { id: string } | null)?.id ?? null

        if (subscriptionId) {
          // Log payment success on the org notification
          const org = await prisma.organization.findFirst({
            where: { subscriptionId },
            select: { id: true },
          })

          if (org) {
            await prisma.notification.create({
              data: {
                organizationId: org.id,
                title: 'Subscription payment received',
                message: `Payment of £${((stripeInvoice.amount_paid ?? 0) / 100).toFixed(2)} received for your subscription.`,
                type: 'SUCCESS',
                link: '/settings',
              },
            })
          }
        }

        console.info(`[stripe-webhook] invoice.payment_succeeded: ${stripeInvoice.id}`)
        break
      }

      case 'invoice.payment_failed': {
        const stripeInvoice = event.data.object as Stripe.Invoice & {
          subscription?: string | { id: string } | null
        }
        const subscriptionId =
          typeof stripeInvoice.subscription === 'string'
            ? stripeInvoice.subscription
            : (stripeInvoice.subscription as { id: string } | null)?.id ?? null

        if (subscriptionId) {
          const org = await prisma.organization.findFirst({
            where: { subscriptionId },
            select: { id: true },
          })

          if (org) {
            await prisma.notification.create({
              data: {
                organizationId: org.id,
                title: 'Subscription payment failed',
                message:
                  'Your subscription payment failed. Please update your payment method to avoid service interruption.',
                type: 'ERROR',
                link: '/settings',
              },
            })

            await prisma.organization.update({
              where: { id: org.id },
              data: { subscriptionStatus: 'past_due' },
            })
          }
        }

        console.info(`[stripe-webhook] invoice.payment_failed: ${stripeInvoice.id}`)
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error(`[stripe-webhook] Error handling event "${event.type}":`, err)
    return new Response('Internal server error', { status: 500 })
  }

  return Response.json({ received: true })
}

import Stripe from 'stripe'

// Lazy singleton — initialised on first call, never at module-eval time
// so Next.js build-time page-data collection doesn't throw when env vars are absent.
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia' as '2026-03-25.dahlia',
    })
  }
  return _stripe
}

// Default export for convenience — safe to import at the top of server files;
// the instance is only created when the function is first invoked.
export default { getStripe } as unknown as Stripe

// Price ID map
export const PRICE_IDS: Record<string, string> = {
  FREE: '',
  PRO: process.env.STRIPE_PRO_PRICE_ID ?? '',
  ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? '',
}

// Map price IDs back to human-readable plan names
export const PLAN_NAMES: Record<string, 'Pro' | 'Enterprise'> = {
  ...(process.env.STRIPE_PRO_PRICE_ID
    ? { [process.env.STRIPE_PRO_PRICE_ID]: 'Pro' as const }
    : {}),
  ...(process.env.STRIPE_ENTERPRISE_PRICE_ID
    ? { [process.env.STRIPE_ENTERPRISE_PRICE_ID]: 'Enterprise' as const }
    : {}),
}

/**
 * Create a Stripe Checkout Session for a subscription upgrade.
 */
export async function createCheckoutSession(
  orgId: string,
  planId: string,
  returnUrl: string,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()
  const priceId = PRICE_IDS[planId]
  if (!priceId) {
    throw new Error(`Invalid planId "${planId}" or price not configured`)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${returnUrl}?canceled=true`,
    metadata: { orgId, planId },
    subscription_data: { metadata: { orgId, planId } },
  })

  return session
}

/**
 * Create a Stripe Billing Portal session so users can manage their subscription.
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

/**
 * Retrieve full details of an existing Stripe subscription.
 */
export async function getSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method', 'items.data.price.product'],
  })

  return subscription
}

/**
 * Create a one-off Stripe Payment Link so customers can pay an invoice online.
 */
export async function createPaymentLink(
  invoiceId: string,
  amount: number,
  description: string,
  returnUrl: string,
): Promise<Stripe.PaymentLink> {
  const stripe = getStripe()

  const price = await stripe.prices.create({
    currency: 'gbp',
    unit_amount: amount,
    product_data: {
      name: description,
      metadata: { invoiceId },
    },
  })

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    after_completion: {
      type: 'redirect',
      redirect: { url: returnUrl },
    },
    metadata: { invoiceId },
  })

  return paymentLink
}

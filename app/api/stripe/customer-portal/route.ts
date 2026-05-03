import { auth } from '@clerk/nextjs/server'
import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { createCustomerPortalSession } from '@/lib/stripe'

export async function POST(req: Request) {
  try {
    const { orgId: clerkOrgId, userId } = await auth()

    if (!userId || !clerkOrgId) {
      return new Response('Unauthorised', { status: 401 })
    }

    const org = await getOrganizationByClerkId(clerkOrgId)
    if (!org) {
      return new Response('Organisation not found', { status: 404 })
    }

    if (!org.stripeCustomerId) {
      return Response.json(
        { error: 'No Stripe customer found. Please subscribe to a plan first.' },
        { status: 422 },
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const returnUrl = `${appUrl}/settings`

    const portalSession = await createCustomerPortalSession(
      org.stripeCustomerId,
      returnUrl,
    )

    return Response.json({ url: portalSession.url })
  } catch (err) {
    console.error('[POST /api/stripe/customer-portal]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

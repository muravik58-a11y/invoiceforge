import { auth } from '@clerk/nextjs/server'
import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { createCheckoutSession } from '@/lib/stripe'

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

    const body = await req.json()
    const { planId } = body as { planId?: string }

    if (!planId) {
      return Response.json({ error: 'planId is required' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const returnUrl = `${appUrl}/settings`

    const session = await createCheckoutSession(org.id, planId, returnUrl)

    if (!session.url) {
      return Response.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('[POST /api/stripe/create-checkout]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

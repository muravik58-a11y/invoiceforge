import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { getOrCreateOrganization } from '@/lib/actions/organization'

export async function POST(req: Request) {
  const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!CLERK_WEBHOOK_SECRET) {
    console.error('[clerk-webhook] CLERK_WEBHOOK_SECRET is not set')
    return new Response('Webhook secret not configured', { status: 500 })
  }

  // Get Svix headers for verification
  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing Svix headers', { status: 400 })
  }

  // Read the raw body
  const body = await req.text()

  // Verify the webhook signature
  const wh = new Webhook(CLERK_WEBHOOK_SECRET)
  let event: WebhookEvent

  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent
  } catch (err) {
    console.error('[clerk-webhook] Signature verification failed:', err)
    return new Response('Invalid webhook signature', { status: 400 })
  }

  const { type, data } = event

  try {
    switch (type) {
      case 'organization.created': {
        const { id: clerkOrgId, name, slug } = data as {
          id: string
          name: string
          slug: string
        }

        await getOrCreateOrganization(clerkOrgId, name, slug ?? clerkOrgId)
        console.info(`[clerk-webhook] organization.created: ${clerkOrgId}`)
        break
      }

      case 'organization.updated': {
        const { id: clerkOrgId, name, slug } = data as {
          id: string
          name: string
          slug: string
        }

        await prisma.organization.updateMany({
          where: { clerkOrgId },
          data: {
            name,
            ...(slug ? { slug } : {}),
          },
        })
        console.info(`[clerk-webhook] organization.updated: ${clerkOrgId}`)
        break
      }

      case 'organization.deleted': {
        const { id: clerkOrgId } = data as { id: string }

        // Cascade delete is handled by Prisma relations (onDelete: Cascade)
        // But first check the org exists
        const org = await prisma.organization.findUnique({
          where: { clerkOrgId },
          select: { id: true },
        })

        if (org) {
          await prisma.organization.delete({ where: { clerkOrgId } })
          console.info(`[clerk-webhook] organization.deleted: ${clerkOrgId}`)
        }
        break
      }

      case 'organizationMembership.created': {
        const { organization, public_user_data } = data as {
          organization: { id: string; name: string }
          public_user_data: { user_id: string; identifier: string }
        }

        // Find the org in our DB
        const org = await prisma.organization.findUnique({
          where: { clerkOrgId: organization.id },
          select: { id: true },
        })

        if (org) {
          await prisma.auditLog.create({
            data: {
              organizationId: org.id,
              userId: public_user_data.user_id,
              userEmail: public_user_data.identifier ?? public_user_data.user_id,
              action: 'member.joined',
              entityType: 'Organization',
              entityId: org.id,
              changes: {
                event: 'organizationMembership.created',
                orgName: organization.name,
              },
            },
          })
          console.info(
            `[clerk-webhook] organizationMembership.created: user ${public_user_data.user_id} joined org ${organization.id}`,
          )
        }
        break
      }

      default:
        // Unhandled event type — ignore silently
        break
    }
  } catch (err) {
    console.error(`[clerk-webhook] Error handling event "${type}":`, err)
    return new Response('Internal server error', { status: 500 })
  }

  return Response.json({ message: 'OK' })
}

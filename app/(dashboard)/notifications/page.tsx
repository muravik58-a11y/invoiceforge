import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { getNotifications } from '@/lib/actions/notifications'
import { NotificationsPageClient } from '@/components/notifications/notifications-page'
import { serialize } from '@/lib/serialize'

export const metadata = {
  title: 'Notifications – InvoiceForge UK',
}

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const { orgId: clerkOrgId, userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  if (!clerkOrgId) {
    redirect('/onboarding')
  }

  const org = await getOrganizationByClerkId(clerkOrgId)
  if (!org) {
    redirect('/onboarding')
  }

  const notifications = await getNotifications(org.id, userId)

  return (
    <NotificationsPageClient
      notifications={serialize(notifications) as any}
      orgId={org.id}
      userId={userId}
    />
  )
}

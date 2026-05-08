import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { SettingsLayout } from '@/components/settings/settings-layout'
import { NotificationSettings } from '@/components/settings/notification-settings'

export const metadata = {
  title: 'Notifications — InvoiceForge UK',
  description: 'Manage your email notification preferences.',
}

export const dynamic = 'force-dynamic'

export default async function NotificationsSettingsPage() {
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

  return (
    <SettingsLayout>
      <NotificationSettings org={org} />
    </SettingsLayout>
  )
}

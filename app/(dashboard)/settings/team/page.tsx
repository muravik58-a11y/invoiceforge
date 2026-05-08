import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { SettingsLayout } from '@/components/settings/settings-layout'
import { TeamSettings } from '@/components/settings/team-settings'

export const metadata = {
  title: 'Team Members — InvoiceForge UK',
  description: 'Manage your team members, roles, and invitations.',
}

export default async function TeamSettingsPage() {
  const { userId, orgId: clerkOrgId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  if (!clerkOrgId) {
    redirect('/onboarding')
  }

  return (
    <SettingsLayout>
      <TeamSettings />
    </SettingsLayout>
  )
}

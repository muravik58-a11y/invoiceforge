import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { SettingsLayout } from '@/components/settings/settings-layout'
import { CompanySettings } from '@/components/settings/company-settings'
import { serialize } from '@/lib/serialize'

export const metadata = {
  title: 'Company Settings — InvoiceForge UK',
  description: 'Manage your company profile, address, banking details, and invoice settings.',
}

export const dynamic = 'force-dynamic'

export default async function CompanySettingsPage() {
  const { orgId: clerkOrgId } = await auth()

  if (!clerkOrgId) {
    redirect('/sign-in')
  }

  const org = await getOrganizationByClerkId(clerkOrgId)

  if (!org) {
    redirect('/onboarding')
  }

  return (
    <SettingsLayout>
      <CompanySettings org={serialize(org) as any} />
    </SettingsLayout>
  )
}

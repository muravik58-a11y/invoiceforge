import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getOrganizationByClerkId, getOrCreateOrganization } from '@/lib/actions/organization'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

export const metadata = {
  title: 'Welcome – InvoiceForge UK',
}

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const { orgId: clerkOrgId, userId, orgSlug } = await auth()

  if (!userId || !clerkOrgId) {
    redirect('/sign-in')
  }

  // Ensure org record exists (creates if not)
  const org = await getOrCreateOrganization(
    clerkOrgId,
    orgSlug ?? 'My Organisation',
    orgSlug ?? clerkOrgId,
  )

  return <OnboardingWizard org={org} />
}

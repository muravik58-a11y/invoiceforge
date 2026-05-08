import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getOrganizationByClerkId, getOrCreateOrganization } from '@/lib/actions/organization'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'

export const metadata = {
  title: 'Welcome – InvoiceForge UK',
}

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const { orgId: clerkOrgId, userId, orgSlug } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // If user is authenticated but has no org, create a personal one automatically
  if (!clerkOrgId) {
    try {
      const client = await clerkClient()
      const newOrg = await client.organizations.createOrganization({
        name: `Personal Workspace`,
        slug: `user-${userId.slice(5, 13)}`,
        createdBy: userId,
      })
      // After creating the org, redirect back so the page reloads with the new orgId
      redirect('/onboarding')
    } catch (err) {
      console.error('[onboarding] Failed to create personal org:', err)
      // Fallback: redirect to sign-in which will prompt org selection
      redirect('/sign-in')
    }
  }

  // Ensure org record exists in our DB (creates if not)
  const org = await getOrCreateOrganization(
    clerkOrgId,
    orgSlug ?? 'My Organisation',
    orgSlug ?? clerkOrgId,
  )

  return <OnboardingWizard org={org} />
}
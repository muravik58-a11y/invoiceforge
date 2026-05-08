import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { getApiKeys } from '@/lib/actions/api-keys'
import { ApiKeysPageClient } from '@/components/api-keys/api-keys-page'
import { serialize } from '@/lib/serialize'

export const metadata = {
  title: 'API Keys – InvoiceForge UK',
}

export const dynamic = 'force-dynamic'

export default async function ApiKeysPage() {
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

  const apiKeys = await getApiKeys(org.id)

  return <ApiKeysPageClient apiKeys={serialize(apiKeys) as any} orgId={org.id} />
}

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getClients } from '@/lib/actions/clients'
import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { ClientsPageClient } from '@/components/clients/clients-page'
import { serialize } from '@/lib/serialize'

export const metadata = {
  title: 'Clients – InvoiceForge UK',
}

export default async function ClientsPage() {
  const { orgId: clerkOrgId } = await auth()

  if (!clerkOrgId) {
    redirect('/sign-in')
  }

  const org = await getOrganizationByClerkId(clerkOrgId)
  if (!org) {
    redirect('/onboarding')
  }

  const { clients } = await getClients(org.id)

  return <ClientsPageClient clients={serialize(clients) as any} orgId={org.id} />
}

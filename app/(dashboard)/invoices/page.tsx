import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getInvoices } from '@/lib/actions/invoices'
import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { InvoicesPageClient } from '@/components/invoices/invoices-page'
import { serialize } from '@/lib/serialize'

export const metadata = {
  title: 'Invoices – InvoiceForge UK',
}

export default async function InvoicesPage() {
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

  const { invoices } = await getInvoices(org.id)

  return <InvoicesPageClient invoices={serialize(invoices) as any} orgId={org.id} />
}

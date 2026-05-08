import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { getRecurringInvoices } from '@/lib/actions/recurring'
import { RecurringInvoicesPage } from '@/components/invoices/recurring-invoices-page'
import { serialize } from '@/lib/serialize'

export const metadata = {
  title: 'Recurring Invoices – InvoiceForge UK',
}

export default async function RecurringPage() {
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

  const recurringInvoices = await getRecurringInvoices(org.id)

  return <RecurringInvoicesPage recurringInvoices={serialize(recurringInvoices) as any} orgId={org.id} />
}

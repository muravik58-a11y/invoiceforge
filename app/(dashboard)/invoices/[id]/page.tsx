import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'

import { getInvoice } from '@/lib/actions/invoices'
import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { InvoiceDetailPage } from '@/components/invoices/invoice-detail'
import { serialize } from '@/lib/serialize'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return { title: `Invoice ${id} – InvoiceForge UK` }
}

export default async function InvoiceDetailRoute({ params }: Props) {
  const { id } = await params
  const { orgId: clerkOrgId } = await auth()

  if (!clerkOrgId) {
    redirect('/onboarding')
  }

  const org = await getOrganizationByClerkId(clerkOrgId)
  if (!org) {
    redirect('/onboarding')
  }

  const invoice = await getInvoice(org.id, id)
  if (!invoice) {
    notFound()
  }

  return <InvoiceDetailPage invoice={serialize(invoice) as any} org={serialize(org) as any} />
}

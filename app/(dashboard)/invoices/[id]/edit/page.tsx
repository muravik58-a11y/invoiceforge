import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'

import { getInvoice } from '@/lib/actions/invoices'
import { getClients } from '@/lib/actions/clients'
import { getProducts } from '@/lib/actions/products'
import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { CreateInvoiceForm } from '@/components/invoices/create-invoice-form'
import { serialize } from '@/lib/serialize'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return { title: `Edit Invoice – InvoiceForge UK` }
}

export default async function EditInvoicePage({ params }: Props) {
  const { id } = await params
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

  const [invoice, { clients }, { products }] = await Promise.all([
    getInvoice(org.id, id),
    getClients(org.id, undefined, 1, 200),
    getProducts(org.id, undefined, 1, 200),
  ])

  if (!invoice) {
    notFound()
  }

  if (invoice.status !== 'DRAFT') {
    redirect(`/invoices/${id}`)
  }

  return (
    <CreateInvoiceForm
      clients={serialize(clients) as any}
      products={serialize(products) as any}
      orgId={org.id}
      userId={userId}
      defaultPaymentTerms={org.defaultPaymentTerms}
      editInvoice={serialize(invoice) as any}
    />
  )
}

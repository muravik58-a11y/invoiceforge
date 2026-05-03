import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getClients } from '@/lib/actions/clients'
import { getProducts } from '@/lib/actions/products'
import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { CreateInvoiceForm } from '@/components/invoices/create-invoice-form'
import { serialize } from '@/lib/serialize'

export const metadata = {
  title: 'New Invoice – InvoiceForge UK',
}

export default async function NewInvoicePage() {
  const { orgId: clerkOrgId, userId } = await auth()

  if (!clerkOrgId || !userId) {
    redirect('/sign-in')
  }

  const org = await getOrganizationByClerkId(clerkOrgId)
  if (!org) {
    redirect('/onboarding')
  }

  const [{ clients }, { products }] = await Promise.all([
    getClients(org.id, undefined, 1, 200),
    getProducts(org.id, undefined, 1, 200),
  ])

  return (
    <CreateInvoiceForm
      clients={serialize(clients) as any}
      products={serialize(products) as any}
      orgId={org.id}
      userId={userId}
      defaultPaymentTerms={org.defaultPaymentTerms}
    />
  )
}

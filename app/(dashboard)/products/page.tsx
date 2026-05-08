import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getProducts } from '@/lib/actions/products'
import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { ProductsPageClient } from '@/components/products/products-page'
import { serialize } from '@/lib/serialize'

export const metadata = {
  title: 'Products & Services – InvoiceForge UK',
}

export default async function ProductsPage() {
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

  const { products } = await getProducts(org.id)

  return <ProductsPageClient products={serialize(products) as any} orgId={org.id} />
}

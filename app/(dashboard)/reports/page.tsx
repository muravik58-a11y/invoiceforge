import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { ReportsPageClient } from '@/components/reports/reports-page'
import { serialize } from '@/lib/serialize'

export const metadata = {
  title: 'Reports — InvoiceForge UK',
  description: 'Revenue analytics, VAT returns, and business insights for your UK business.',
}

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
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

  return <ReportsPageClient orgId={org.id} />
}

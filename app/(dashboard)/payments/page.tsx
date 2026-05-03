import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { getPayments } from '@/lib/actions/payments'
import { PaymentsPageClient } from '@/components/payments/payments-page'
import { serialize } from '@/lib/serialize'

export const metadata = {
  title: 'Payments – InvoiceForge UK',
}

export const dynamic = 'force-dynamic'

export default async function PaymentsPage() {
  const { orgId: clerkOrgId, userId } = await auth()

  if (!userId || !clerkOrgId) {
    redirect('/sign-in')
  }

  const org = await getOrganizationByClerkId(clerkOrgId)
  if (!org) {
    redirect('/onboarding')
  }

  const { payments } = await getPayments(org.id, { limit: 100 })

  return (
    <PaymentsPageClient
      payments={serialize(payments) as any}
      orgId={org.id}
      userId={userId}
    />
  )
}

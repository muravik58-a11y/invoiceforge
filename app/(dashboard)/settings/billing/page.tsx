import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { SettingsLayout } from '@/components/settings/settings-layout'
import { BillingSettings } from '@/components/settings/billing-settings'
import prisma from '@/lib/prisma'
import { serialize } from '@/lib/serialize'

export const metadata = {
  title: 'Billing & Plan — InvoiceForge UK',
  description: 'Manage your subscription, usage, and billing history.',
}

export const dynamic = 'force-dynamic'

export default async function BillingSettingsPage() {
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

  // Fetch usage counts
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [invoicesUsed, clientsUsed] = await Promise.all([
    prisma.invoice.count({
      where: {
        organizationId: org.id,
        createdAt: { gte: startOfMonth },
        status: { notIn: ['CANCELLED'] },
      },
    }),
    prisma.client.count({
      where: {
        organizationId: org.id,
      },
    }),
  ])

  const currentPlan = org.planId.toLowerCase() as 'free' | 'pro' | 'enterprise'

  return (
    <SettingsLayout>
      <BillingSettings
        org={serialize(org) as any}
        currentPlan={currentPlan}
        invoicesUsed={invoicesUsed}
        clientsUsed={clientsUsed}
      />
    </SettingsLayout>
  )
}

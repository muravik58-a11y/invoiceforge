import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { getOrganizationByClerkId } from '@/lib/actions/organization'
import { getDashboardStats, getMonthlyRevenueData } from '@/lib/actions/dashboard'
import { DashboardPage } from '@/components/dashboard/dashboard-page'
import { serialize } from '@/lib/serialize'

export const metadata = {
  title: 'Dashboard — InvoiceForge UK',
  description: 'Your invoicing overview: revenue, outstanding payments, and recent activity.',
}

// Force dynamic rendering so data is always fresh
export const dynamic = 'force-dynamic'

export default async function DashboardHomePage() {
  // ── Authentication ────────────────────────────────────────────────────────
  const { orgId: clerkOrgId } = await auth()

  if (!clerkOrgId) {
    // User is signed in but has no org — send them to the org creation flow
    redirect('/sign-in')
  }

  // ── Organisation ──────────────────────────────────────────────────────────
  const org = await getOrganizationByClerkId(clerkOrgId)

  if (!org) {
    // Org exists in Clerk but not yet in our DB — trigger onboarding
    redirect('/onboarding')
  }

  // ── Data fetching (parallelised) ──────────────────────────────────────────
  const [stats, monthlyRevenue] = await Promise.all([
    getDashboardStats(org.id),
    getMonthlyRevenueData(org.id),
  ])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardPage
      stats={serialize(stats) as any}
      org={serialize(org) as any}
      monthlyRevenue={serialize(monthlyRevenue) as any}
    />
  )
}
